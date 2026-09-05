import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 2;

// Sonnet 5 pricing: $2/1M input tokens, $10/1M output tokens.
// Web search: $10 per 1,000 searches, billed separately from tokens.
const PRICE_INPUT_PER_M = 2;
const PRICE_OUTPUT_PER_M = 10;
const PRICE_PER_SEARCH = 0.01;

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MATCH-NOTES] ${step}${d}`);
};

function estimateCost(usage: any) {
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  const webSearches = usage?.server_tool_use?.web_search_requests ?? 0;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M +
    webSearches * PRICE_PER_SEARCH;
  return { inputTokens, outputTokens, webSearches, estimatedCostUsd };
}

const SYSTEM_PROMPT = `Você é um assistente de um narrador esportivo brasileiro que está prestes a transmitir uma partida ao vivo.

Regra mais importante: o narrador NUNCA pode ficar sem nenhuma informação sobre um time. Para cada time, siga esta ordem:

1. Pesquise na web informações específicas sobre ESSE confronto: retrospecto recente de cada time, confrontos diretos entre eles, e notícias relevantes (lesões, desfalques, técnico, contexto da competição/rodada).
2. Se não encontrar nada específico sobre a partida (comum em categorias regionais/estaduais menores), pesquise na web informações gerais e verdadeiras sobre a história do time: ano de fundação, apelido, cores, maior rival, principais títulos, torcida, estádio. Todo time tem pelo menos isso, até os menores.
3. Nunca entregue um bloco vazio ou vago. Use o passo 2 como último recurso, mas sempre entregue de 3 a 5 fatos concretos e verdadeiros por time — nunca invente informação, mas também nunca desista de encontrar algo real.

Responda SOMENTE no formato abaixo, sem introduções, saudações ou comentários fora dele. De 3 a 5 tópicos curtos (uma linha cada) por time, em português, prontos para o narrador consultar ao vivo. Use "###" seguido do nome do time como título de cada bloco, na mesma ordem em que os times foram informados (time da casa primeiro, visitante depois):

### <nome do time da casa>
- tópico
- tópico

### <nome do time visitante>
- tópico
- tópico`;

// Splits on markdown "###" headings and takes the first two sections in
// order (home team, then away team) -- doesn't depend on the model using any
// particular literal heading text, since it tends to title each section with
// the real team name instead of a placeholder token.
function splitSections(text: string): { teamA: string; teamB: string } | null {
  const headings = [...text.matchAll(/^###[ \t]*.*$/gm)];
  if (headings.length < 2) return null;
  const sliceAfter = (i: number) => {
    const start = headings[i].index! + headings[i][0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index! : text.length;
    return text.slice(start, end).trim();
  };
  const teamA = sliceAfter(0);
  const teamB = sliceAfter(1);
  // Only bail out if BOTH sections came back empty -- if just one is thin,
  // still return what we have rather than discarding a usable half.
  if (!teamA && !teamB) return null;
  return { teamA, teamB };
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
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { id: user.id });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_generation_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("success", true)
      .gte("created_at", since);

    if ((count ?? 0) >= DAILY_LIMIT) {
      logStep("Daily limit reached", { count });
      return new Response(JSON.stringify({ error: "Limite diário de gerações atingido. Tente novamente amanhã." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { teamA, teamB, competition, round, matchDate } = await req.json();
    if (!teamA || !teamB) throw new Error("teamA e teamB são obrigatórios");

    const userMessage = [
      `Time da casa: ${teamA}`,
      `Time visitante: ${teamB}`,
      `Competição: ${competition || 'não informado'}`,
      `Rodada: ${round || 'não informado'}`,
      `Data: ${matchDate || 'não informado'}`,
    ].join('\n');

    logStep("Calling Anthropic", { teamA, teamB });
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      logStep("Anthropic API error", { status: aiRes.status, body: errBody });
      throw new Error(`Erro na API da Anthropic (${aiRes.status})`);
    }

    const aiData = await aiRes.json();
    const text = (aiData.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    const { inputTokens, outputTokens, webSearches, estimatedCostUsd } = estimateCost(aiData.usage);
    logStep("Usage", { inputTokens, outputTokens, webSearches, estimatedCostUsd: estimatedCostUsd.toFixed(4) });

    const sections = splitSections(text);
    if (!sections) {
      logStep("Failed to parse AI response", { text });
      // Still log the spend -- this call was billed even though parsing
      // failed -- but don't count it against the user's daily allowance.
      await supabase.from("ai_generation_log").insert({
        user_id: user.id, success: false,
        input_tokens: inputTokens, output_tokens: outputTokens,
        web_searches: webSearches, estimated_cost_usd: estimatedCostUsd,
      });
      throw new Error("Não foi possível interpretar a resposta da IA. Tente novamente.");
    }

    await supabase.from("ai_generation_log").insert({
      user_id: user.id, success: true,
      input_tokens: inputTokens, output_tokens: outputTokens,
      web_searches: webSearches, estimated_cost_usd: estimatedCostUsd,
    });
    logStep("Success");

    return new Response(JSON.stringify(sections), {
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
