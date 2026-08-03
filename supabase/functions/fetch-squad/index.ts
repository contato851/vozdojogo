import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  fetchSquadByTeamId,
  fetchCurrentCoach,
  mapSquadPlayers,
  normalize,
  type MappedPlayer,
} from "../_shared/apiFootball.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // refreshed daily by the sync-team-squads cron

type SquadOverrideRow = {
  id: string;
  action: "add" | "deactivate";
  player_id: string | null;
  player_data: MappedPlayer | null;
};

function applyOverrides(players: MappedPlayer[], overrides: SquadOverrideRow[]): MappedPlayer[] {
  const deactivatedIds = new Set(
    overrides.filter((o) => o.action === "deactivate" && o.player_id).map((o) => o.player_id)
  );

  const active = players.filter((p) => !deactivatedIds.has(p.id));

  const added = overrides
    .filter((o) => o.action === "add" && o.player_data)
    .map((o) => ({ ...(o.player_data as MappedPlayer), id: `override-${o.id}` }));

  return [...active, ...added];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamName } = await req.json();

    if (!teamName || typeof teamName !== "string") {
      return new Response(JSON.stringify({ error: "teamName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY");
    if (!API_FOOTBALL_KEY) {
      throw new Error("API_FOOTBALL_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Team resolution no longer does a live name search — it only trusts
    // team_api_mappings, which was built and reviewed offline. This is what
    // prevents ever silently matching the wrong team (different country,
    // youth/reserve squad, unrelated homonym club).
    const { data: mapping } = await supabase
      .from("team_api_mappings")
      .select("api_football_team_id, api_football_team_name, confidence, needs_narrator_confirmation")
      .eq("app_team_name", teamName)
      .maybeSingle();

    if (!mapping) {
      return new Response(
        JSON.stringify({ error: `Time ainda não mapeado: "${teamName}". Peça pra um admin mapear em team_api_mappings.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mapping.confidence !== "confirmed" || mapping.api_football_team_id == null) {
      return new Response(
        JSON.stringify({ error: "Elenco automático indisponível para este time — preencha manualmente." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiTeamId = mapping.api_football_team_id;
    const resolvedTeamName = mapping.api_football_team_name ?? teamName;

    const { data: cachedRow } = await supabase
      .from("team_squads")
      .select("players, coach, fetched_at")
      .eq("api_team_id", apiTeamId)
      .maybeSingle();

    const isFresh = cachedRow && Date.now() - new Date(cachedRow.fetched_at).getTime() < CACHE_TTL_MS;

    let mapped: MappedPlayer[];
    let coach: string;
    let source: string;

    if (cachedRow && isFresh) {
      mapped = cachedRow.players as MappedPlayer[];
      coach = cachedRow.coach;
      source = "team-squads-cache";
    } else {
      const [squadPlayers, fetchedCoach] = await Promise.all([
        fetchSquadByTeamId(apiTeamId, API_FOOTBALL_KEY),
        fetchCurrentCoach(apiTeamId, API_FOOTBALL_KEY),
      ]);
      mapped = mapSquadPlayers(squadPlayers);
      coach = fetchedCoach;
      source = "api-football";
    }

    if (mapped.length === 0) {
      return new Response(
        JSON.stringify({ error: `A API-Football não retornou elenco para "${resolvedTeamName}".` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (source === "api-football") {
      const { error: upsertError } = await supabase
        .from("team_squads")
        .upsert(
          {
            api_team_id: apiTeamId,
            team_name: resolvedTeamName,
            team_name_normalized: normalize(resolvedTeamName),
            coach,
            players: mapped,
            source: "api-football",
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "api_team_id" }
        );
      if (upsertError) console.error("team_squads upsert error:", upsertError);
    }

    const { data: overrides } = await supabase
      .from("squad_overrides")
      .select("id, action, player_id, player_data")
      .eq("api_team_id", apiTeamId)
      .eq("is_active", true)
      .eq("status", "confirmed"); // 'suggested' overrides stay private to whoever created them

    const merged = applyOverrides(mapped, (overrides ?? []) as SquadOverrideRow[]);

    const starters = merged.slice(0, 11);
    const reserves = merged.slice(11);

    console.log("fetch-squad result", {
      teamName,
      resolvedTeamName,
      apiTeamId,
      total: merged.length,
      overridesApplied: overrides?.length ?? 0,
      source,
    });

    const responseBody: Record<string, unknown> = {
      starters,
      reserves,
      coach,
      source,
      resolvedTeamName,
      apiTeamId,
    };

    if (mapping.needs_narrator_confirmation) {
      responseBody.warning = "Confirme se este é o time correto antes de usar ao vivo";
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-squad error:", error);

    const errorMessage = error instanceof Error ? error.message : "Erro ao buscar elenco";

    if (errorMessage.startsWith("API_FOOTBALL_429")) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições da API-Football excedido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (errorMessage === "API_FOOTBALL_KEY is not configured") {
      return new Response(
        JSON.stringify({ error: "API-Football não está configurada no servidor (API_FOOTBALL_KEY ausente)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
