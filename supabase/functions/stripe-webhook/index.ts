import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response("Server config error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    logStep("ERROR", { message: "No stripe-signature header" });
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    logStep("ERROR", { message: `Webhook verification failed: ${err}` });
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email || session.customer_email || "";
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || "";

        logStep("Checkout completed", { email, customerId, subscriptionId });

        // Upsert billing_customer
        const { data: existingBC } = await supabase
          .from("billing_customers")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        let billingCustomerId: string;
        if (existingBC) {
          billingCustomerId = existingBC.id;
          await supabase.from("billing_customers").update({ email }).eq("id", billingCustomerId);
        } else {
          const { data: newBC } = await supabase
            .from("billing_customers")
            .insert({ email, stripe_customer_id: customerId })
            .select("id")
            .single();
          billingCustomerId = newBC!.id;
        }

        // Get subscription details from Stripe
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id || null;
          const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          const isActive = sub.status === "active" || sub.status === "trialing";

          // Upsert subscription
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (existingSub) {
            await supabase.from("subscriptions").update({
              status: sub.status,
              access_granted: isActive,
              current_period_end: periodEnd,
              stripe_price_id: priceId,
            }).eq("id", existingSub.id);
          } else {
            await supabase.from("subscriptions").insert({
              billing_customer_id: billingCustomerId,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              status: sub.status,
              access_granted: isActive,
              current_period_end: periodEnd,
            });
          }
        }

        // Update checkout_session record
        await supabase.from("checkout_sessions")
          .update({ status: "completed", stripe_customer_id: customerId, completed_at: new Date().toISOString() })
          .eq("stripe_checkout_session_id", session.id);

        logStep("Checkout processed successfully");
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
        const isActive = sub.status === "active" || sub.status === "trialing";
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        const priceId = sub.items.data[0]?.price?.id || null;

        logStep("Subscription updated", { subscriptionId, status: sub.status });

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (existingSub) {
          await supabase.from("subscriptions").update({
            status: sub.status,
            access_granted: isActive,
            current_period_end: periodEnd,
            stripe_price_id: priceId,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          }).eq("id", existingSub.id);
        } else {
          // Find billing customer
          const { data: bc } = await supabase
            .from("billing_customers")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (bc) {
            await supabase.from("subscriptions").insert({
              billing_customer_id: bc.id,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              status: sub.status,
              access_granted: isActive,
              current_period_end: periodEnd,
              canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { id: sub.id });

        await supabase.from("subscriptions").update({
          status: "canceled",
          access_granted: false,
          canceled_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id || "";
        logStep("Payment failed", { subscriptionId });

        if (subscriptionId) {
          // Mark as past_due but keep access for grace period
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

          await supabase.from("subscriptions").update({
            status: sub.status,
            access_granted: sub.status === "past_due", // grace period
            current_period_end: periodEnd,
          }).eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    logStep("ERROR processing event", { message: String(err) });
    return new Response(`Error: ${err}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
