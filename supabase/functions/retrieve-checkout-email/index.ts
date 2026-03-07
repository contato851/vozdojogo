import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RETRIEVE-CHECKOUT-EMAIL] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    logStep("Retrieving session", { session_id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const email = session.customer_details?.email || session.customer_email || "";
    const customerId = typeof session.customer === "string" ? session.customer : "";
    const paymentStatus = session.payment_status;

    logStep("Session retrieved", { email, paymentStatus, customerId });

    if (paymentStatus !== "paid") {
      return new Response(JSON.stringify({
        error: "payment_not_completed",
        message: "Pagamento ainda não foi confirmado.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if account already exists for this email
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email) || false;

    // Save/update checkout session in DB
    const { data: existingSession } = await supabase
      .from("checkout_sessions")
      .select("id")
      .eq("stripe_checkout_session_id", session_id)
      .maybeSingle();

    if (!existingSession) {
      await supabase.from("checkout_sessions").insert({
        stripe_checkout_session_id: session_id,
        email,
        stripe_customer_id: customerId,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({
      email,
      stripe_customer_id: customerId,
      user_exists: userExists,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
