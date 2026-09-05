import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_AMOUNT = 14.90;

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
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
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    // Ensure a billing_customers row exists for this user.
    const { data: existingBc } = await supabase
      .from("billing_customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    let billingCustomerId: string;
    if (existingBc) {
      billingCustomerId = existingBc.id;
    } else {
      const { data: newBc, error: bcError } = await supabase
        .from("billing_customers")
        .insert({ email: user.email, auth_user_id: user.id })
        .select("id")
        .single();
      if (bcError) throw new Error(`Failed to create billing customer: ${bcError.message}`);
      billingCustomerId = newBc.id;
    }

    const origin = req.headers.get("origin") ?? "";
    // Mercado Pago rejects back_url values that aren't https, and also
    // rejects localhost/127.0.0.1 outright (even over https) -- both hit
    // during local dev. Fall back to a valid placeholder there; a real
    // deployment's https origin takes the real branch automatically.
    const isDevOrigin = !origin.startsWith("https://") || origin.includes("localhost") || origin.includes("127.0.0.1");
    const backUrl = isDevOrigin
      ? "https://www.mercadopago.com.br"
      : `${origin}/escalacao?assinatura=sucesso`;
    if (isDevOrigin) logStep("Dev origin detected, using placeholder back_url", { origin });

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: "Voz do Jogo - Assinatura Mensal",
        payer_email: user.email,
        external_reference: user.id,
        back_url: backUrl,
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PLAN_AMOUNT,
          currency_id: "BRL",
        },
      }),
    });

    if (!mpRes.ok) {
      const errBody = await mpRes.text();
      logStep("Mercado Pago API error", { status: mpRes.status, body: errBody });
      throw new Error(`Erro na API do Mercado Pago (${mpRes.status})`);
    }

    const preapproval = await mpRes.json();
    logStep("Preapproval created", { id: preapproval.id });

    await supabase.from("subscriptions").insert({
      billing_customer_id: billingCustomerId,
      mp_preapproval_id: preapproval.id,
      status: "pending",
      access_granted: false,
    });

    return new Response(JSON.stringify({ url: preapproval.init_point }), {
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
