import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 2;
const GROQ_MODEL = "openai/gpt-oss-120b";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MATCH-NOTES] ${step}${d}`);
};

const SYSTEM_PROMPT = `Você é um produtor de pauta esportiva brasileiro, preparando as notas que vai entregar a um narrador minutos antes de uma partida ao vivo.

Você vai receber três blocos de resultados de busca na web:
1. Um bloco sobre O CONFRONTO ESPECÍFICO entre os dois times (esse jogo em particular, ou histórico recente entre eles).
2. Um bloco geral sobre o time da casa.
3. Um bloco geral sobre o time visitante.

PRIORIDADE MÁXIMA: para cada time, use primeiro o bloco do CONFRONTO ESPECÍFICO -- extraia dele o máximo de fatos possível sobre aquele time (resultado, desfalques, escalação, contexto da rodada, retrospecto direto contra o adversário). Só recorra ao bloco geral daquele time se o bloco do confronto não tiver nada aproveitável sobre ele, ou pra completar quando o confronto trouxer poucos fatos.

ATENÇÃO A NOMES DUPLICADOS: muitos clubes brasileiros pequenos/regionais compartilham nome com clubes famosos de outros estados ou países (ex: existe um "Colo-Colo" na Bahia E um "Colo-Colo" gigante no Chile; existe "Palmeiras" em várias cidades pequenas além do paulista; "Nacional", "União", "Ferroviário", "Independente" também se repetem). Antes de usar qualquer fato de um resultado de busca, confira se ele bate com o CONTEXTO informado (competição, estado/cidade, país) -- a competição e os nomes dos dois times informados no início da mensagem são a fonte da verdade sobre qual time é esse. Se um resultado descrever um clube diferente (outro estado, outro país, outra categoria) que só coincide no nome, IGNORE esse resultado por completo -- não use nenhum fato dele, nem mencione títulos/estádios/história que pertençam ao clube errado.

Regra mais importante: o narrador NUNCA pode ficar sem nenhuma informação sobre um time. Se, depois de descartar resultados do clube errado, nenhum bloco trouxer nada útil e confiável (comum em categorias regionais/estaduais menores), diga apenas o que for genérico e seguro sobre um clube desse porte/região (ex: disputa a categoria X do estado Y) em vez de inventar títulos ou fatos específicos. Nunca invente informação, mas também nunca desista de encontrar algo real -- nunca entregue um bloco vazio.

TOM DE VOZ: escreva como uma pauta de produção de verdade, do jeito que um produtor entrega pro narrador em cima da hora -- natural e fluido, como se estivesse explicando o jogo pra um colega, não uma lista fria de estatísticas telegráficas. Cada tópico deve ser uma frase completa, com conectivos naturais ("chega embalado depois de...", "não perde há...", "a torcida aposta que...", "o técnico deve mandar a campo..."). Continua direto e objetivo -- sem enrolação, sem emoji, sem gracinha -- só escrito como gente fala, não como planilha.

Responda SOMENTE no formato abaixo, sem introduções, saudações ou comentários fora dele. De 3 a 5 tópicos por time, em português, prontos para o narrador consultar ao vivo. Use "###" seguido do nome do time como título de cada bloco, na mesma ordem em que os times foram informados (time da casa primeiro, visitante depois):

### <nome do time da casa>
- tópico
- tópico

### <nome do time visitante>
- tópico
- tópico`;

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
  if (!teamA && !teamB) return null;
  return { teamA, teamB };
}

async function tavilySearch(apiKey: string, query: string) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_depth: "basic",
      include_answer: true,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Erro na API do Tavily (${res.status}): ${errBody}`);
  }
  return res.json();
}

function formatSearchResults(label: string, data: any): string {
  const lines: string[] = [`Resultados de busca -- ${label}:`];
  if (data.answer) lines.push(`Resumo: ${data.answer}`);
  for (const r of data.results ?? []) {
    lines.push(`- ${r.title}: ${r.content}`);
  }
  if ((data.results ?? []).length === 0 && !data.answer) lines.push('(nenhum resultado encontrado)');
  return lines.join('\n');
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
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY is not set");
    const tavilyKey = Deno.env.get("TAVILY_API_KEY");
    if (!tavilyKey) throw new Error("TAVILY_API_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { id: user.id });

    // Count generations by calendar day in Brazil time (UTC-3, no DST since
    // 2019), not a rolling 24h window -- otherwise a generation late in the
    // day still blocks the user early the next day.
    const BR_OFFSET_MS = 3 * 60 * 60 * 1000;
    const brNow = new Date(Date.now() - BR_OFFSET_MS);
    const since = new Date(
      Date.UTC(brNow.getUTCFullYear(), brNow.getUTCMonth(), brNow.getUTCDate()) + BR_OFFSET_MS
    ).toISOString();
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

    const ctx = competition ? ` ${competition}` : '';
    const queryMatch = `${teamA} x ${teamB}${ctx} ${round || ''} ${matchDate || ''} resultado notícias retrospecto escalação desfalques confronto direto`;
    const queryTeamA = `${teamA}${ctx} história fundação títulos apelido rival torcida estádio`;
    const queryTeamB = `${teamB}${ctx} história fundação títulos apelido rival torcida estádio`;

    logStep("Searching Tavily", { teamA, teamB });
    const [searchMatch, searchTeamA, searchTeamB] = await Promise.all([
      tavilySearch(tavilyKey, queryMatch),
      tavilySearch(tavilyKey, queryTeamA),
      tavilySearch(tavilyKey, queryTeamB),
    ]);

    const userMessage = [
      `Time da casa: ${teamA}`,
      `Time visitante: ${teamB}`,
      `Competição: ${competition || 'não informado'}`,
      `Rodada: ${round || 'não informado'}`,
      `Data: ${matchDate || 'não informado'}`,
      '',
      formatSearchResults(`confronto ${teamA} x ${teamB}`, searchMatch),
      '',
      formatSearchResults(`geral sobre ${teamA}`, searchTeamA),
      '',
      formatSearchResults(`geral sobre ${teamB}`, searchTeamB),
    ].join('\n');

    logStep("Calling Groq", { teamA, teamB, model: GROQ_MODEL });
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      logStep("Groq API error", { status: groqRes.status, body: errBody });
      throw new Error(`Erro na API do Groq (${groqRes.status})`);
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content ?? '';
    const usage = groqData.usage ?? {};
    const inputTokens = usage.prompt_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? 0;
    logStep("Usage", { inputTokens, outputTokens });

    const sections = splitSections(text);
    if (!sections) {
      logStep("Failed to parse AI response", { text });
      await supabase.from("ai_generation_log").insert({
        user_id: user.id, success: false,
        input_tokens: inputTokens, output_tokens: outputTokens,
        web_searches: 3, estimated_cost_usd: 0,
      });
      throw new Error("Não foi possível interpretar a resposta da IA. Tente novamente.");
    }

    await supabase.from("ai_generation_log").insert({
      user_id: user.id, success: true,
      input_tokens: inputTokens, output_tokens: outputTokens,
      web_searches: 3, estimated_cost_usd: 0,
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
