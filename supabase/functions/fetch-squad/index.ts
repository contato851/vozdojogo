import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RawPlayer = {
  number?: string | number;
  name?: string;
};

type RawSquad = {
  starters?: RawPlayer[];
  reserves?: RawPlayer[];
  coach?: string;
};

function normalizeName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\b\d{1,3}\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .toUpperCase();
}

function sanitizeNumber(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[^\d]/g, "").slice(0, 3);
}

function sanitizePlayers(players: RawPlayer[] | undefined, prefix: "s" | "r", limit: number) {
  const seenNames = new Set<string>();

  return (players ?? [])
    .map((player) => ({
      number: sanitizeNumber(player.number),
      name: normalizeName(String(player.name ?? "")),
    }))
    .filter((player) => player.name.length >= 2)
    .filter((player) => {
      if (seenNames.has(player.name)) return false;
      seenNames.add(player.name);
      return true;
    })
    .slice(0, limit)
    .map((player, index) => ({
      id: `${prefix}-${index}`,
      number: player.number,
      name: player.name,
    }));
}

async function fetchFirecrawlContext(teamName: string, firecrawlApiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${teamName} elenco atual jogadores site:ogol.com.br OR site:transfermarkt.com OR site:ge.globo.com OR site:espn.com.br`,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Firecrawl search error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const results = Array.isArray(data?.data) ? data.data : [];

    if (!results.length) return null;

    const normalizedTeam = teamName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const best = results
      .map((item: any) => {
        const title = String(item?.title ?? "");
        const url = String(item?.url ?? "");
        const description = String(item?.description ?? "");
        const markdown = String(item?.markdown ?? "");

        const searchable = `${title} ${url} ${description} ${markdown.slice(0, 1500)}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

        let score = 0;
        if (searchable.includes(normalizedTeam)) score += 5;
        if (/elenco|squad|jogadores|plantel/.test(searchable)) score += 2;
        if (/ogol|transfermarkt|ge\.globo|espn/.test(searchable)) score += 1;

        return { markdown, url, score };
      })
      .filter((item: any) => item.markdown && item.markdown.length > 300)
      .sort((a: any, b: any) => b.score - a.score)[0];

    if (!best || best.score < 3) {
      console.log("Firecrawl context ignored due low relevance for", teamName);
      return null;
    }

    console.log("Firecrawl context source:", best.url, "score:", best.score);
    return best.markdown.slice(0, 4500);
  } catch (error) {
    console.error("Firecrawl context error:", error);
    return null;
  }
}

async function callAiForSquad(params: {
  lovableApiKey: string;
  teamName: string;
  today: string;
  context: string | null;
}): Promise<RawSquad> {
  const systemPrompt = `Você é especialista em futebol e precisa retornar o elenco atual de um time.

Data atual: ${params.today}.

REGRAS:
- Retorne SEMPRE 11 titulares e até 12 reservas (não retorne vazio)
- Use o contexto web quando disponível; se o contexto for insuficiente, use seu melhor conhecimento atualizado
- "name": somente nome do jogador em MAIÚSCULAS
- "number": somente dígitos em string (se desconhecido, string vazia)
- "coach": nome do técnico atual`;

  const userPrompt = params.context
    ? `Time: ${params.teamName}\n\nContexto web:\n${params.context}`
    : `Retorne o elenco atual do time: ${params.teamName}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_squad",
            description: "Return squad with starters, reserves and coach",
            parameters: {
              type: "object",
              properties: {
                starters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      number: { type: "string" },
                      name: { type: "string" },
                    },
                    required: ["number", "name"],
                    additionalProperties: false,
                  },
                },
                reserves: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      number: { type: "string" },
                      name: { type: "string" },
                    },
                    required: ["number", "name"],
                    additionalProperties: false,
                  },
                },
                coach: { type: "string" },
              },
              required: ["starters", "reserves", "coach"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "return_squad" },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI_GATEWAY_${response.status}:${errText}`);
  }

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall?.function?.name !== "return_squad") {
    throw new Error("AI did not return squad data");
  }

  const args = toolCall.function.arguments;
  if (typeof args === "string") return JSON.parse(args) as RawSquad;
  if (typeof args === "object" && args) return args as RawSquad;

  throw new Error("Invalid AI tool payload");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamName } = await req.json();

    if (!teamName) {
      return new Response(JSON.stringify({ error: "teamName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const today = new Date().toISOString().split("T")[0];

    const context = FIRECRAWL_API_KEY
      ? await fetchFirecrawlContext(teamName, FIRECRAWL_API_KEY)
      : null;

    const rawSquad = await callAiForSquad({
      lovableApiKey: LOVABLE_API_KEY,
      teamName,
      today,
      context,
    });

    let starters = sanitizePlayers(rawSquad?.starters, "s", 11);
    let reserves = sanitizePlayers(rawSquad?.reserves, "r", 12);

    // If starters came short, fill from reserves so the UI always has a full base lineup
    if (starters.length < 11 && reserves.length > 0) {
      const starterNames = new Set(starters.map((p) => p.name));
      const fillers = reserves.filter((p) => !starterNames.has(p.name)).slice(0, 11 - starters.length);
      starters = [
        ...starters,
        ...fillers.map((player, index) => ({ ...player, id: `s-fill-${index}` })),
      ].slice(0, 11);
    }

    const finalStarterNames = new Set(starters.map((p) => p.name));
    reserves = reserves.filter((p) => !finalStarterNames.has(p.name)).slice(0, 12);

    const coach = String(rawSquad?.coach ?? "").trim();

    console.log("fetch-squad result", {
      teamName,
      source: context ? "web+ai" : "ai",
      starters: starters.length,
      reserves: reserves.length,
      coach: Boolean(coach),
    });

    return new Response(
      JSON.stringify({
        starters,
        reserves,
        coach,
        source: context ? "web+ai" : "ai",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-squad error:", error);

    const errorMessage = error instanceof Error ? error.message : "Erro ao buscar elenco";

    if (errorMessage.startsWith("AI_GATEWAY_429")) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (errorMessage.startsWith("AI_GATEWAY_402")) {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes para a IA." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
