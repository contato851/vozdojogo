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

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
  const digitsOnly = raw.replace(/[^\d]/g, "");
  return digitsOnly.slice(0, 3);
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

function isUsableSquad(squad: RawSquad | null): boolean {
  if (!squad) return false;

  const starters = Array.isArray(squad.starters) ? squad.starters : [];
  const reserves = Array.isArray(squad.reserves) ? squad.reserves : [];

  const namedStarters = starters.filter((p) => String(p?.name ?? "").trim().length >= 2);
  const namedReserves = reserves.filter((p) => String(p?.name ?? "").trim().length >= 2);

  return namedStarters.length >= 8 || namedReserves.length >= 10;
}

async function callAiForSquad(params: {
  lovableApiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<RawSquad> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_squad",
            description:
              "Return the squad of a football team with starters, reserves, and coach.",
            parameters: {
              type: "object",
              properties: {
                starters: {
                  type: "array",
                  description: "11 starting players",
                  items: {
                    type: "object",
                    properties: {
                      number: { type: "string", description: "Jersey number" },
                      name: { type: "string", description: "Player name in UPPERCASE" },
                    },
                    required: ["number", "name"],
                    additionalProperties: false,
                  },
                },
                reserves: {
                  type: "array",
                  description: "Reserve players (up to 12)",
                  items: {
                    type: "object",
                    properties: {
                      number: { type: "string", description: "Jersey number" },
                      name: { type: "string", description: "Player name in UPPERCASE" },
                    },
                    required: ["number", "name"],
                    additionalProperties: false,
                  },
                },
                coach: { type: "string", description: "Head coach full name" },
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

  const rawArgs = toolCall.function.arguments;
  if (typeof rawArgs === "string") {
    return JSON.parse(rawArgs) as RawSquad;
  }

  if (typeof rawArgs === "object" && rawArgs !== null) {
    return rawArgs as RawSquad;
  }

  throw new Error("Invalid AI tool payload");
}

async function getFirecrawlContext(teamName: string, firecrawlApiKey: string): Promise<string | null> {
  try {
    const query = `${teamName} elenco atual jogadores site:ogol.com.br OR site:transfermarkt.com OR site:ge.globo.com OR site:espn.com.br`;

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
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

    if (results.length === 0) {
      console.log("Firecrawl returned no search results");
      return null;
    }

    const normalizedTeam = normalizeText(teamName);

    const scoredResults = results
      .map((result: any) => {
        const url = String(result?.url ?? "");
        const title = String(result?.title ?? "");
        const description = String(result?.description ?? "");
        const markdown = String(result?.markdown ?? result?.content ?? "");

        const indexText = normalizeText(`${url} ${title} ${description} ${markdown.slice(0, 2000)}`);

        let score = 0;
        if (indexText.includes(normalizedTeam)) score += 4;
        if (/ogol|transfermarkt|ge\.globo|espn/.test(indexText)) score += 2;
        if (/elenco|squad|jogadores|plantel/.test(indexText)) score += 1;

        return { url, title, markdown, score };
      })
      .filter((result: any) => result.markdown && result.markdown.length > 100)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 2);

    if (scoredResults.length === 0) {
      console.log("Firecrawl returned results but no usable markdown");
      return null;
    }

    console.log("Firecrawl usable sources:", scoredResults.map((r: any) => r.url));

    const context = scoredResults
      .map((result: any) => `--- FONTE: ${result.url} ---\n${result.markdown.slice(0, 7000)}`)
      .join("\n\n");

    return context.slice(0, 14000);
  } catch (error) {
    console.error("Firecrawl context error:", error);
    return null;
  }
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

    let squad: RawSquad | null = null;
    let source: "web" | "ai" = "ai";

    if (FIRECRAWL_API_KEY) {
      const webContext = await getFirecrawlContext(teamName, FIRECRAWL_API_KEY);

      if (webContext) {
        try {
          squad = await callAiForSquad({
            lovableApiKey: LOVABLE_API_KEY,
            model: "google/gemini-3-pro-preview",
            systemPrompt: `Você é um analista tático de futebol que EXTRAI elenco de textos reais.\n\nData atual: ${today}.\n\nREGRAS:\n- Use apenas jogadores citados nas fontes\n- Retorne 11 titulares + até 12 reservas\n- Nomes em MAIÚSCULAS e sem extras\n- number deve ser só dígitos em string\n- Se não houver número explícito, use string vazia\n- Técnico: nome do treinador atual que aparecer nas fontes\n- Se houver conflito entre fontes, priorize a fonte mais recente`,
            userPrompt: `Extraia o elenco atual do ${teamName} usando APENAS o conteúdo abaixo:\n\n${webContext}`,
          });

          if (isUsableSquad(squad)) {
            source = "web";
          } else {
            console.log("Web extraction returned low-confidence squad, falling back to AI knowledge");
            squad = null;
          }
        } catch (error) {
          console.error("Web extraction AI step failed:", error);
          squad = null;
        }
      }
    }

    if (!isUsableSquad(squad)) {
      squad = await callAiForSquad({
        lovableApiKey: LOVABLE_API_KEY,
        model: "google/gemini-2.5-pro",
        systemPrompt: `Você é especialista em futebol com foco em elencos atuais.\n\nData atual: ${today}.\n\nREGRAS:\n- Retorne o elenco mais atualizado possível\n- 11 titulares + até 12 reservas\n- Nomes em MAIÚSCULAS, curtos e sem duplicação\n- number apenas dígitos em string\n- Técnico: nome completo`,
        userPrompt: `Retorne o elenco atual do time: ${teamName}`,
      });

      source = "ai";
    }

    let starters = sanitizePlayers(squad?.starters, "s", 11);
    let reserves = sanitizePlayers(squad?.reserves, "r", 12);

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

    const coach = String(squad?.coach ?? "").trim();

    console.log("Squad result:", {
      teamName,
      source,
      starters: starters.length,
      reserves: reserves.length,
      hasCoach: Boolean(coach),
    });

    return new Response(
      JSON.stringify({ starters, reserves, coach, source }),
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
