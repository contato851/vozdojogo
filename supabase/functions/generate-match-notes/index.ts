import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 1;
const GROQ_MODEL = "openai/gpt-oss-120b";
const WIKI_UA = "VozDoJogoApp/1.0 (https://vozdojogo.app.br)";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MATCH-NOTES] ${step}${d}`);
};

// Same disambiguation table used for club crests (useTeamLogo.ts) -- a plain
// Wikipedia search for a generic name like "Grêmio" or "Colo-Colo" can match
// a different, more famous club with the same name.
const WIKI_OVERRIDES: Record<string, string> = {
  'FLAMENGO': 'Clube de Regatas do Flamengo',
  'VASCO': 'Club de Regatas Vasco da Gama',
  'BOTAFOGO': 'Botafogo de Futebol e Regatas',
  'FLUMINENSE': 'Fluminense Football Club',
  'PALMEIRAS': 'Sociedade Esportiva Palmeiras',
  'CORINTHIANS': 'Sport Club Corinthians Paulista',
  'SÃO PAULO': 'São Paulo Futebol Clube',
  'SANTOS': 'Santos Futebol Clube',
  'GRÊMIO': 'Grêmio Foot-Ball Porto Alegrense',
  'INTERNACIONAL': 'Sport Club Internacional',
  'CRUZEIRO': 'Cruzeiro Esporte Clube',
  'ATLÉTICO-MG': 'Clube Atlético Mineiro',
  'BAHIA': 'Esporte Clube Bahia',
  'VITÓRIA': 'Esporte Clube Vitória',
  'SPORT': 'Sport Club do Recife',
  'NÁUTICO': 'Clube Náutico Capibaribe',
  'SANTA CRUZ': 'Santa Cruz Futebol Clube',
  'CEARÁ': 'Ceará Sporting Club',
  'FORTALEZA': 'Fortaleza Esporte Clube',
  'CORITIBA': 'Coritiba Foot Ball Club',
  'ATHLETICO-PR': 'Club Athletico Paranaense',
  'PARANÁ': 'Paraná Clube',
  'GOIÁS': 'Goiás Esporte Clube',
  'ATLÉTICO-GO': 'Atlético Clube Goianiense',
  'VILA NOVA': 'Vila Nova Futebol Clube',
  'PONTE PRETA': 'Associação Atlética Ponte Preta',
  'GUARANI': 'Guarani Futebol Clube',
  'BRAGANTINO': 'Red Bull Bragantino',
  'AVAÍ': 'Avaí Futebol Clube',
  'FIGUEIRENSE': 'Figueirense Futebol Clube',
  'CHAPECOENSE': 'Associação Chapecoense de Futebol',
  'CRICIÚMA': 'Criciúma Esporte Clube',
  'JOINVILLE': 'Joinville Esporte Clube',
  'JUVENTUDE': 'Esporte Clube Juventude',
  'CUIABÁ': 'Cuiabá Esporte Clube',
  'AMÉRICA-MG': 'América Futebol Clube (Belo Horizonte)',
  'TOMBENSE': 'Tombense Futebol Clube',
  'REMO': 'Clube do Remo',
  'PAYSANDU': 'Paysandu Sport Club',
  'ABC': 'ABC Futebol Clube',
  'AMÉRICA-RN': 'América Futebol Clube (Natal)',
  'CSA': 'Centro Sportivo Alagoano',
  'CRB': 'Clube de Regatas Brasil',
  'SAMPAIO CORRÊA': 'Sampaio Corrêa Futebol Clube',
  'ITUANO': 'Ituano Futebol Clube',
  'MIRASSOL': 'Mirassol Futebol Clube',
  'NOVORIZONTINO': 'Grêmio Novorizontino',
  'BOTAFOGO-SP': 'Botafogo Futebol Clube (Ribeirão Preto)',
  'PORTUGUESA': 'Associação Portuguesa de Desportos',
  'BRASILIENSE': 'Brasiliense Futebol Clube',
  'GAMA': 'Sociedade Esportiva do Gama',
  'CONFIANÇA': 'Associação Desportiva Confiança',
  'SERGIPE': 'Club Sportivo Sergipe',
  'LONDRINA': 'Londrina Esporte Clube',
  'MARINGÁ': 'Maringá Futebol Clube',
  'OPERÁRIO-PR': 'Operário Ferroviário Esporte Clube',
  'SÃO BERNARDO': 'São Bernardo Futebol Clube',
  'ÁGUA SANTA': 'Esporte Clube Água Santa',
  'FERROVIÁRIA': 'Associação Ferroviária de Esportes',
  'XV DE PIRACICABA': 'Esporte Clube XV de Novembro (Piracicaba)',
  'INTER DE LIMEIRA': 'Associação Atlética Internacional (Limeira)',
  'ATHLETIC CLUB': 'Athletic Club (Minas Gerais)',
};

const SYSTEM_PROMPT = `Você é um produtor de pauta esportiva brasileiro, preparando as notas que vai entregar a um narrador minutos antes de uma partida ao vivo.

Você vai receber quatro blocos de material:
1. CONFRONTO ESPECÍFICO: resultados de busca sobre esse jogo em particular (retrospecto recente, desfalques, escalação, contexto da rodada, retrospecto direto entre os dois times).
2 e 3. CURIOSIDADE GENUÍNA (Wikipédia) sobre cada time: texto corrido com história, rivalidades, apelidos, momentos marcantes -- ótima fonte pra dar cor e contexto.
4. Um bloco geral de busca na web sobre cada time (fallback caso os outros dois não tenham nada aproveitável).

PRIORIDADE MÁXIMA, NESTA ORDEM: para cada time, comece SEMPRE pelo bloco do CONFRONTO ESPECÍFICO -- é a informação mais importante e mais atual, sobre esse jogo em particular, e deve vir primeiro sempre que existir. Use a CURIOSIDADE GENUÍNA (Wikipédia) para complementar e dar cor -- rivalidade, apelido, recorde, momento marcante -- mas nunca no lugar de uma informação real e atual sobre o confronto quando ela existir. Só recorra ao bloco geral de busca se os dois anteriores não tiverem nada aproveitável sobre aquele time.

SEJA BREVE em cada tópico -- uma frase direta, sem listar escalação completa jogador por jogador (isso consome espaço demais). Resuma desfalques em no máximo um ou dois nomes.

NUNCA INVENTE PLACAR OU RESULTADO -- ISSO É O PIOR ERRO POSSÍVEL AQUI: você só pode afirmar que um time venceu, perdeu ou empatou -- e citar qualquer placar -- se isso estiver escrito literalmente no "Resumo" ou nos resultados de busca do bloco CONFRONTO ESPECÍFICO. Se o resumo disser algo como "informação não disponível" ou "not available", ou se nenhum resultado de busca trouxer um placar confirmado para ESSA partida específica, é PROIBIDO inventar um resultado -- mesmo que pareça plausível. Nesse caso, fale sobre a expectativa para o jogo, a posição de cada time na tabela, ou o retrospecto histórico geral entre os dois (sem números de placar inventados) em vez de dizer quem venceu.

O QUE É UMA BOA CURIOSIDADE (para complementar o confronto): a origem de um apelido, uma rivalidade histórica, um recorde marcante, um momento icônico ou emocionante da história do clube, um retrospecto direto interessante contra o adversário, um contexto de rodada que muda o clima do jogo (briga por título, fuga do rebaixamento, jejum acabando).
O QUE EVITAR como conteúdo principal (só use como último recurso, se nada mais existir): estatística fria de temporada sem contexto narrativo ("posse de bola média de 54%", "12 jogos sem sofrer gol") -- isso é informação de placar, não curiosidade, e deixa o texto com cara de planilha.

ATENÇÃO A NOMES DUPLICADOS: muitos clubes brasileiros pequenos/regionais compartilham nome com clubes famosos de outros estados ou países (ex: existe um "Colo-Colo" na Bahia E um "Colo-Colo" gigante no Chile; existe "Palmeiras" em várias cidades pequenas além do paulista; "Nacional", "União", "Ferroviário", "Independente" também se repetem). Antes de usar qualquer fato de um resultado de busca, confira se ele bate com o CONTEXTO informado (competição, estado/cidade, país) -- a competição e os nomes dos dois times informados no início da mensagem são a fonte da verdade sobre qual time é esse. Se um resultado descrever um clube diferente (outro estado, outro país, outra categoria) que só coincide no nome, IGNORE esse resultado por completo -- não use nenhum fato dele, nem mencione títulos/estádios/história que pertençam ao clube errado.

Regra mais importante: o narrador NUNCA pode ficar sem nenhuma informação sobre um time. Se, depois de descartar resultados do clube errado, nenhum bloco trouxer nada útil e confiável (comum em categorias regionais/estaduais menores), diga apenas o que for genérico e seguro sobre um clube desse porte/região (ex: disputa a categoria X do estado Y) em vez de inventar títulos ou fatos específicos. Nunca invente informação, mas também nunca desista de encontrar algo real -- nunca entregue um bloco vazio.

TOM DE VOZ: escreva como uma pauta de produção de verdade, do jeito que um produtor entrega pro narrador em cima da hora -- natural e fluido, como se estivesse contando uma história pra um colega, não uma lista fria de estatísticas telegráficas. Cada tópico deve ser uma frase completa, com conectivos naturais. Direto e objetivo -- sem enrolação, sem emoji, sem gracinha -- só escrito como gente fala, não como planilha.

No máximo 3 tópicos curtos por time.

Responda SOMENTE no formato abaixo, sem introduções, saudações ou comentários fora dele. Use "###" seguido do nome do time como título de cada bloco, na mesma ordem em que os times foram informados (time da casa primeiro, visitante depois):

### <nome do time da casa>
- tópico
- tópico

### <nome do time visitante>
- tópico
- tópico`;

// The model repeatedly fabricates a scoreline for the specific match even
// when explicitly told the search found no confirmed result (tested live:
// it invented the same "2 a 0" score twice in a row despite Tavily's own
// summary saying "not available" right next to it in the prompt) -- prompt
// wording alone isn't reliable enough here, so this is a deterministic code
// backstop. If nothing in the raw search content looks like an actual score
// for this matchup, any line in the model's output that both looks like a
// score and uses a result word gets dropped rather than risk reading a
// made-up result out loud, live.
const UNAVAILABLE_RE = /not available|n[ãa]o (est[áa] |)dispon[íi]vel|no information|not found|sem informa[çc][õo]es/i;
const SCORE_RE = /\b\d{1,2}\s*(?:a|x|X|×|-|–)\s*\d{1,2}\b/;
const RESULT_WORD_RE = /(venceu|derrota(?:do)?|perdeu|goleou|empatou|vit[óo]ria|triunfo|bateu)/i;
// Also catches invented head-to-head streak claims ("10 jogos invicto"),
// which the model fabricates with the same confidence as a scoreline when
// no real retrospecto was found -- same failure mode, different shape.
const STREAK_NUM_RE = /\b\d{1,3}\s*(jogos?|confrontos?|partidas?|rodadas?|anos?)\b/i;
const STREAK_WORD_RE = /(invic|invenc|sequ[êe]ncia|s[ée]rie de|jejum)/i;

function hasConfirmedScore(searchData: any): boolean {
  const answer = String(searchData?.answer ?? '');
  if (UNAVAILABLE_RE.test(answer)) return false;
  const haystack = [answer, ...(searchData?.results ?? []).map((r: any) => `${r.title} ${r.content}`)].join(' ');
  return SCORE_RE.test(haystack);
}

function stripUnconfirmedScoreLines(text: string, confirmed: boolean): string {
  if (confirmed) return text;
  return text
    .split('\n')
    .filter(line => {
      const isScoreClaim = SCORE_RE.test(line) && RESULT_WORD_RE.test(line);
      const isStreakClaim = STREAK_NUM_RE.test(line) && STREAK_WORD_RE.test(line);
      return !isScoreClaim && !isStreakClaim;
    })
    .join('\n');
}

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
      max_results: 3,
      search_depth: "advanced",
      include_answer: true,
      chunks_per_source: 1,
      include_domains: ["ge.globo.com", "globoesporte.globo.com", "espn.com.br", "placar.abril.com.br", "lance.com.br", "uol.com.br", "terra.com.br", "trivela.com.br"],
      include_domains_mode: "boost",
      exclude_domains: ["sofascore.com", "fbref.com", "flashscore.com", "transfermarkt.com.br", "transfermarkt.com", "whoscored.com", "livescore.com"],
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

// Dedicated "genuine curiosity" source, distinct from the match-stats search
// above -- Wikipedia's prose (founding story, nickname origin, rivalries) is
// exactly the color a narrator wants, which generic web search mostly won't
// surface on its own.
async function wikipediaCuriosity(team: string): Promise<string> {
  try {
    const override = WIKI_OVERRIDES[team.toUpperCase()];
    let title: string;
    if (override) {
      title = override;
    } else {
      const searchUrl = `https://pt.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(team + ' futebol clube')}&limit=1`;
      const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': WIKI_UA } });
      if (!searchRes.ok) return '(Wikipédia indisponível)';
      const searchData = await searchRes.json();
      const page = searchData.pages?.[0];
      if (!page) return '(nenhum artigo encontrado na Wikipédia)';
      title = page.key;
    }
    const extractUrl = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const extractRes = await fetch(extractUrl, { headers: { 'User-Agent': WIKI_UA } });
    if (!extractRes.ok) return '(Wikipédia indisponível)';
    const extractData = await extractRes.json();
    const pages = extractData.query?.pages;
    const first = pages ? Object.values(pages)[0] as any : null;
    const extract = first?.extract as string | undefined;
    if (!extract) return '(sem texto disponível)';
    return extract.slice(0, 700);
  } catch {
    return '(erro ao buscar Wikipédia)';
  }
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
      return new Response(JSON.stringify({ error: "Você já usou sua geração de IA hoje. A geração é renovada diariamente — tente de novo amanhã." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { teamA, teamB, competition, round, matchDate } = await req.json();
    if (!teamA || !teamB) throw new Error("teamA e teamB são obrigatórios");

    const ctx = competition ? ` ${competition}` : '';
    const queryMatch = `${teamA} x ${teamB}${ctx} ${round || ''} ${matchDate || ''} resultado notícias retrospecto escalação desfalques confronto direto`;
    const queryTeamA = `${teamA}${ctx} curiosidades história rivalidade recorde momento marcante`;
    const queryTeamB = `${teamB}${ctx} curiosidades história rivalidade recorde momento marcante`;

    logStep("Searching Tavily + Wikipedia", { teamA, teamB });
    const [searchMatch, searchTeamA, searchTeamB, wikiA, wikiB] = await Promise.all([
      tavilySearch(tavilyKey, queryMatch),
      tavilySearch(tavilyKey, queryTeamA),
      tavilySearch(tavilyKey, queryTeamB),
      wikipediaCuriosity(teamA),
      wikipediaCuriosity(teamB),
    ]);

    const matchScoreConfirmed = hasConfirmedScore(searchMatch);

    const userMessage = [
      `Time da casa: ${teamA}`,
      `Time visitante: ${teamB}`,
      `Competição: ${competition || 'não informado'}`,
      `Rodada: ${round || 'não informado'}`,
      `Data: ${matchDate || 'não informado'}`,
      '',
      formatSearchResults(`confronto ${teamA} x ${teamB}`, searchMatch),
      ...(matchScoreConfirmed ? [] : [
        '',
        '🚫 AVISO DO SISTEMA: a busca acima NÃO confirmou nenhum placar, resultado ou sequência de jogos (invencibilidade/jejum) real para esse confronto específico. NÃO mencione nenhum número desse tipo para esse jogo -- nem placar, nem "X jogos invicto/sem perder". Fale só sobre expectativa, contexto de tabela, ou use a curiosidade da Wikipédia abaixo.',
      ]),
      '',
      `Curiosidade genuína (Wikipédia) sobre ${teamA}:\n${wikiA}`,
      '',
      `Curiosidade genuína (Wikipédia) sobre ${teamB}:\n${wikiB}`,
      '',
      formatSearchResults(`geral (fallback) sobre ${teamA}`, searchTeamA),
      '',
      formatSearchResults(`geral (fallback) sobre ${teamB}`, searchTeamB),
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
        max_tokens: 1500,
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
    let text = groqData.choices?.[0]?.message?.content ?? '';
    const usage = groqData.usage ?? {};
    const inputTokens = usage.prompt_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? 0;
    logStep("Usage", { inputTokens, outputTokens });

    if (!matchScoreConfirmed) {
      const before = text;
      text = stripUnconfirmedScoreLines(text, false);
      if (text !== before) logStep("Stripped unconfirmed score/streak claim from AI output", { teamA, teamB });
    }

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
