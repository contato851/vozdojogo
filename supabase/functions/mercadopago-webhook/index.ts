import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRACE_DAYS = 7;

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${d}`);
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Mercado Pago signs webhooks with: header "x-signature: ts=<ms>,v1=<hex hmac>"
// over the manifest "id:{data.id (from the URL query string, lowercased)};
// request-id:{x-request-id header};ts:{ts};", HMAC-SHA256 with a webhook
// secret configured separately from the API access token.
async function verifySignature(req: Request, url: URL, secret: string): Promise<boolean> {
  const sigHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id") ?? "";
  if (!sigHeader) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map(p => p.trim().split("=").map(s => s.trim()))
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const dataId = (url.searchParams.get("data.id") ?? "").toLowerCase();
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = await hmacSha256Hex(secret, manifest);
  return expected === v1;
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
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    if (!mpToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    if (!webhookSecret) throw new Error("MERCADOPAGO_WEBHOOK_SECRET is not set");

    const url = new URL(req.url);
    const bodyText = await req.text();

    const valid = await verifySignature(req, url, webhookSecret);
    if (!valid) {
      logStep("Invalid signature");
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText || "{}");
    const type = body.type ?? url.searchParams.get("type");
    const dataId = body.data?.id ?? url.searchParams.get("data.id");
    logStep("Notification received", { type, dataId });

    if (type === "subscription_preapproval" && dataId) {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
        headers: { "Authorization": `Bearer ${mpToken}` },
      });
      if (!mpRes.ok) {
        logStep("Failed to fetch preapproval", { status: mpRes.status });
        return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
      }
      const preapproval = await mpRes.json();

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id, billing_customer_id")
        .eq("mp_preapproval_id", preapproval.id)
        .maybeSingle();

      const isAuthorized = preapproval.status === "authorized";
      const update: any = {
        status: preapproval.status,
        access_granted: isAuthorized,
        ...(isAuthorized ? { grace_deadline: null } : {}),
      };

      if (existingSub) {
        await supabase.from("subscriptions").update(update).eq("id", existingSub.id);
        if (preapproval.payer_id) {
          await supabase.from("billing_customers")
            .update({ mp_payer_id: String(preapproval.payer_id) })
            .eq("id", existingSub.billing_customer_id);
        }
      } else if (preapproval.external_reference) {
        // Subscription created out-of-band (shouldn't normally happen since
        // create-checkout inserts the row up front) -- link by auth_user_id.
        const { data: bc } = await supabase
          .from("billing_customers")
          .select("id")
          .eq("auth_user_id", preapproval.external_reference)
          .maybeSingle();
        if (bc) {
          await supabase.from("subscriptions").insert({
            billing_customer_id: bc.id,
            mp_preapproval_id: preapproval.id,
            ...update,
          });
        }
      }
      logStep("Preapproval synced", { status: preapproval.status });
    } else if (type === "payment" && dataId) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { "Authorization": `Bearer ${mpToken}` },
      });
      if (mpRes.ok) {
        const payment = await mpRes.json();
        const preapprovalId = payment.preapproval_id ?? payment.point_of_interaction?.transaction_data?.preapproval_id;
        if (preapprovalId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("mp_preapproval_id", preapprovalId)
            .maybeSingle();
          if (sub) {
            if (payment.status === "approved") {
              await supabase.from("subscriptions").update({ grace_deadline: null }).eq("id", sub.id);
            } else if (payment.status === "rejected" || payment.status === "cancelled") {
              const deadline = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
              await supabase.from("subscriptions").update({ grace_deadline: deadline }).eq("id", sub.id);
            }
            logStep("Payment processed", { preapprovalId, status: payment.status });
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
