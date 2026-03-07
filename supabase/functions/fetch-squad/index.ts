import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize team name for URL search
function normalizeForSearch(teamName: string): string {
  return teamName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Try to scrape squad data from OGol
async function scrapeSquadFromOgol(teamName: string, apiKey: string): Promise<string | null> {
  try {
    const searchQuery = `${teamName} elenco jogadores 2026`;
    console.log("Firecrawl search query:", searchQuery);

    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${teamName} squad players roster 2026 site:ogol.com.br OR site:espn.com.br OR site:ge.globo.com OR site:transfermarkt.com.br`,
        limit: 3,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errText);
      return null;
    }

    const searchData = await searchResponse.json();
    console.log("Firecrawl search results count:", searchData.data?.length || 0);

    if (!searchData.data || searchData.data.length === 0) {
      return null;
    }

    // Combine the markdown from top results
    const combinedContent = searchData.data
      .map((result: any) => {
        const markdown = result.markdown || "";
        const url = result.url || "";
        return `--- Source: ${url} ---\n${markdown}`;
      })
      .join("\n\n");

    if (combinedContent.length < 100) {
      console.log("Scraped content too short, likely not useful");
      return null;
    }

    console.log("Scraped content length:", combinedContent.length);
    return combinedContent.substring(0, 15000); // Limit to avoid token overflow
  } catch (error) {
    console.error("Firecrawl scraping error:", error);
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

    // Step 1: Try to scrape real squad data
    let scrapedData: string | null = null;
    if (FIRECRAWL_API_KEY) {
      console.log("Firecrawl available, scraping squad data for:", teamName);
      scrapedData = await scrapeSquadFromOgol(teamName, FIRECRAWL_API_KEY);
    } else {
      console.log("Firecrawl not available, using AI-only approach");
    }

    // Step 2: Use AI to extract/format the squad data
    const today = new Date().toISOString().split("T")[0];

    let systemPrompt: string;
    let userMessage: string;

    if (scrapedData) {
      // We have real scraped data - AI just needs to extract and format
      systemPrompt = `Você é um especialista em futebol. Sua tarefa é EXTRAIR dados de elenco a partir de conteúdo real de sites esportivos.

A data de hoje é ${today}.

REGRAS IMPORTANTES:
- EXTRAIA os jogadores REAIS que aparecem no conteúdo fornecido
- O campo "name" deve conter APENAS o nome do jogador em MAIÚSCULAS, usando nomes populares/curtos
- O campo "number" deve conter APENAS o número da camisa como string
- Use nomes populares/curtos (ex: "GABIGOL" não "Gabriel Barbosa")
- NÃO invente jogadores que não estão no conteúdo
- Titulares: 11 jogadores mais prováveis (1 goleiro, defensores, meias, atacantes)
- Reservas: demais jogadores importantes (até 12)
- Técnico: nome do técnico atual
- Ordene por posição: goleiro, defensores, meias, atacantes
- Se os números de camisa não estiverem disponíveis no conteúdo, use números prováveis baseados na posição`;

      userMessage = `Extraia o elenco atual do ${teamName} a partir deste conteúdo real de sites esportivos:\n\n${scrapedData}`;
    } else {
      // Fallback: AI generates from its knowledge
      systemPrompt = `Você é um especialista em futebol brasileiro e internacional com conhecimento dos elencos dos clubes.

A data de hoje é ${today}. Retorne o elenco mais atual possível do time solicitado.

REGRAS IMPORTANTES:
- O campo "name" deve conter APENAS o nome do jogador em MAIÚSCULAS
- O campo "number" deve conter APENAS o número da camisa como string
- Use nomes populares/curtos (ex: "GABIGOL" não "Gabriel Barbosa")
- NÃO repita nomes em formatos diferentes
- Titulares: 11 jogadores na formação mais provável
- Reservas: demais jogadores importantes do elenco (até 12)
- Técnico: nome completo do técnico atual
- Ordene por posição: goleiro, defensores, meias, atacantes
- Se não conhecer o time, retorne um elenco vazio`;

      userMessage = `Retorne o elenco atual do time: ${teamName}`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
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
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para a IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received, source:", scrapedData ? "scraped+AI" : "AI-only");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "return_squad") {
      throw new Error("AI did not return squad data");
    }

    const squad = JSON.parse(toolCall.function.arguments);

    const starters = (squad.starters || []).slice(0, 11).map(
      (p: any, i: number) => ({
        id: `s-${i}`,
        number: String(p.number || ""),
        name: String(p.name || "").toUpperCase(),
      })
    );

    const reserves = (squad.reserves || []).map((p: any, i: number) => ({
      id: `r-${i}`,
      number: String(p.number || ""),
      name: String(p.name || "").toUpperCase(),
    }));

    const coach = squad.coach || "";

    return new Response(
      JSON.stringify({ starters, reserves, coach, source: scrapedData ? "web" : "ai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-squad error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro ao buscar elenco";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
