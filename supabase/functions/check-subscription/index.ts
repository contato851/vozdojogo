import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

function safeTimestamp(value: any): Date | null {
  if (!value && value !== 0) return null;
  // Stripe returns Unix timestamps (seconds)
  if (typeof value === 'number') {
    const d = new Date(value * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  // DB returns ISO strings
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    // Check billing_customers table first (webhook-populated)
    const { data: bc } = await supabase
      .from("billing_customers")
      .select("id, stripe_customer_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (bc) {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("billing_customer_id", bc.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (subs && subs.length > 0) {
        const sub = subs[0];
        const gracePeriod = sub.status === "past_due";
        let graceDaysRemaining = 0;

        if (gracePeriod && sub.current_period_end) {
          const periodEnd = safeTimestamp(sub.current_period_end);
          if (periodEnd) {
            const graceEnd = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
            graceDaysRemaining = Math.max(0, Math.ceil((graceEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
            
            if (graceDaysRemaining <= 0) {
              await supabase.from("subscriptions").update({ access_granted: false }).eq("id", sub.id);
              logStep("Grace period expired");
              return new Response(JSON.stringify({ subscribed: false, grace_period: false, grace_days_remaining: 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }

        logStep("Subscription found in DB", { status: sub.status, access: sub.access_granted });
        return new Response(JSON.stringify({
          subscribed: sub.access_granted,
          subscription_end: sub.current_period_end ?? null,
          grace_period: gracePeriod,
          grace_days_remaining: graceDaysRemaining,
          status: sub.status,
          stripe_price_id: sub.stripe_price_id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    logStep("No DB records, checking Stripe API");

    // Fallback: check Stripe directly
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    logStep("Active subs query done", { count: activeSubs.data.length });

    if (activeSubs.data.length > 0) {
      const sub = activeSubs.data[0];
      const periodEnd = safeTimestamp(sub.current_period_end);
      const subscriptionEnd = periodEnd ? periodEnd.toISOString() : null;
      logStep("Active sub found", { end: subscriptionEnd, rawEnd: sub.current_period_end });
      
      // Sync to DB
      try {
        const { data: existingBC } = await supabase
          .from("billing_customers")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        let bcId: string;
        if (existingBC) {
          bcId = existingBC.id;
          await supabase.from("billing_customers").update({ auth_user_id: user.id }).eq("id", bcId);
        } else {
          const { data: newBC } = await supabase
            .from("billing_customers")
            .insert({ email: user.email, stripe_customer_id: customerId, auth_user_id: user.id })
            .select("id")
            .single();
          bcId = newBC!.id;
        }

        const priceId = sub.items?.data?.[0]?.price?.id || null;
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();

        if (!existingSub) {
          await supabase.from("subscriptions").insert({
            billing_customer_id: bcId,
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            status: sub.status,
            access_granted: true,
            current_period_end: subscriptionEnd,
          });
        }
      } catch (syncErr) {
        logStep("DB sync error (non-fatal)", { message: String(syncErr) });
      }

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_end: subscriptionEnd,
        grace_period: false,
        grace_days_remaining: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check past_due
    const pastDueSubs = await stripe.subscriptions.list({ customer: customerId, status: "past_due", limit: 1 });
    if (pastDueSubs.data.length > 0) {
      const sub = pastDueSubs.data[0];
      const periodEnd = safeTimestamp(sub.current_period_end);
      if (periodEnd) {
        const graceEnd = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.max(0, Math.ceil((graceEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

        if (daysRemaining > 0) {
          return new Response(JSON.stringify({
            subscribed: true,
            subscription_end: graceEnd.toISOString(),
            grace_period: true,
            grace_days_remaining: daysRemaining,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    logStep("No active subscription");
    return new Response(JSON.stringify({ subscribed: false }), {
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
