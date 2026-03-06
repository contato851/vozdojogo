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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
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
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check active subscriptions
    const activeSubs = await stripe.subscriptions.list({
      customer: customerId, status: "active", limit: 1,
    });

    if (activeSubs.data.length > 0) {
      const sub = activeSubs.data[0];
      const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { end: subscriptionEnd });
      return new Response(JSON.stringify({
        subscribed: true,
        subscription_end: subscriptionEnd,
        grace_period: false,
        grace_days_remaining: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check past_due subscriptions (grace period)
    const pastDueSubs = await stripe.subscriptions.list({
      customer: customerId, status: "past_due", limit: 1,
    });

    if (pastDueSubs.data.length > 0) {
      const sub = pastDueSubs.data[0];
      // Grace period: 7 days from when it became past_due
      const periodEnd = new Date(sub.current_period_end * 1000);
      const graceDays = 7;
      const graceEnd = new Date(periodEnd.getTime() + graceDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

      if (daysRemaining > 0) {
        logStep("Grace period active", { daysRemaining });
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_end: graceEnd.toISOString(),
          grace_period: true,
          grace_days_remaining: daysRemaining,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    logStep("No active subscription");
    return new Response(JSON.stringify({
      subscribed: false,
      grace_period: false,
      grace_days_remaining: 0,
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
