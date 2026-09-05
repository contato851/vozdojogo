import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { id: user.id });

    const { data: bc } = await supabase
      .from("billing_customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!bc) {
      logStep("No billing customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("billing_customer_id", bc.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!subs || subs.length === 0) {
      logStep("No subscription found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sub = subs[0];

    // If the webhook hasn't landed yet (still "pending"), refresh live from
    // Mercado Pago so a freshly-created subscription doesn't look stuck.
    if (sub.status === "pending") {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`, {
        headers: { "Authorization": `Bearer ${mpToken}` },
      });
      if (mpRes.ok) {
        const preapproval = await mpRes.json();
        const update: any = { status: preapproval.status, access_granted: preapproval.status === "authorized" };
        if (preapproval.payer_id) {
          await supabase.from("billing_customers").update({ mp_payer_id: String(preapproval.payer_id) }).eq("id", bc.id);
        }
        const { data: updated } = await supabase
          .from("subscriptions")
          .update(update)
          .eq("id", sub.id)
          .select("*")
          .single();
        if (updated) sub = updated;
        logStep("Refreshed from Mercado Pago", { status: sub.status });
      }
    }

    // Mercado Pago keeps a subscription "authorized" while it internally
    // retries a failed recurring charge (auto-cancelling only after repeated
    // failures) -- grace_deadline is our own 7-day window, set by the
    // webhook when a payment is rejected, mirroring the grace period Stripe
    // gave for free on "past_due".
    let gracePeriod = false;
    let graceDaysRemaining = 0;
    if (sub.status === "authorized" && sub.grace_deadline) {
      const deadline = new Date(sub.grace_deadline).getTime();
      graceDaysRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
      if (graceDaysRemaining > 0) {
        gracePeriod = true;
      } else {
        await supabase.from("subscriptions").update({ access_granted: false }).eq("id", sub.id);
        logStep("Grace period expired");
        return new Response(JSON.stringify({ subscribed: false, grace_period: false, grace_days_remaining: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    logStep("Subscription found", { status: sub.status, access: sub.access_granted });
    return new Response(JSON.stringify({
      subscribed: sub.access_granted,
      subscription_end: sub.current_period_end ?? null,
      grace_period: gracePeriod,
      grace_days_remaining: graceDaysRemaining,
      status: sub.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
