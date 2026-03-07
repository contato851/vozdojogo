import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const systemPrompt = `Você é um especialista em futebol brasileiro e internacional com conhecimento atualizado dos elencos dos clubes.

Quando o usuário fornecer o nome de um time, retorne o elenco atual do time usando a tool fornecida.

REGRAS IMPORTANTES:
- O campo "name" deve conter APENAS o nome do jogador em MAIÚSCULAS, SEM o número da camisa. Exemplo correto: "ARRASCAETA". Exemplo errado: "ARRASCAETA Arrascaeta 14".
- O campo "number" deve conter APENAS o número da camisa como string. Exemplo correto: "14". 
- Use nomes populares/curtos (ex: "GABIGOL" não "Gabriel Barbosa", "ARRASCAETA" não "Giorgian De Arrascaeta", "ROSSI" não "Rossi Agustín")
- NÃO repita o nome em formatos diferentes. Use apenas UMA versão do nome, em MAIÚSCULAS.
- NÃO inclua informações extras no nome (como "(Lesionado)", número, etc.)
- Titulares: 11 jogadores na formação mais provável (1 goleiro, defensores, meias, atacantes)
- Reservas: demais jogadores importantes do elenco (até 12)
- Técnico: nome completo do técnico atual (não em maiúsculas)
- Ordene os titulares por posição: goleiro primeiro, depois defensores, meias e atacantes
- Se não conhecer o time, retorne um elenco vazio`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Retorne o elenco atual do time: ${teamName}`,
            },
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
                          number: {
                            type: "string",
                            description: "Jersey number",
                          },
                          name: {
                            type: "string",
                            description:
                              "Player name in UPPERCASE, popular/short form",
                          },
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
                          number: {
                            type: "string",
                            description: "Jersey number",
                          },
                          name: {
                            type: "string",
                            description:
                              "Player name in UPPERCASE, popular/short form",
                          },
                        },
                        required: ["number", "name"],
                        additionalProperties: false,
                      },
                    },
                    coach: {
                      type: "string",
                      description: "Head coach full name",
                    },
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
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "return_squad") {
      throw new Error("AI did not return squad data");
    }

    const squad = JSON.parse(toolCall.function.arguments);

    // Validate and format
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
      JSON.stringify({ starters, reserves, coach }),
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
