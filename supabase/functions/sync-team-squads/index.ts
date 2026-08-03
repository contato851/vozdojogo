import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { fetchSquadByTeamId, fetchCurrentCoach, mapSquadPlayers } from "../_shared/apiFootball.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Sequential + throttled to stay under API-Football's per-minute rate limit.
const REQUEST_DELAY_MS = 1100;
const MAX_TEAMS_PER_RUN = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  if (!CRON_SECRET) {
    return new Response(JSON.stringify({ error: "CRON_SECRET is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY");
  if (!API_FOOTBALL_KEY) {
    return new Response(JSON.stringify({ error: "API_FOOTBALL_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data: teams, error: listError } = await supabase
    .from("team_squads")
    .select("api_team_id, team_name")
    .order("fetched_at", { ascending: true }) // stalest first
    .limit(MAX_TEAMS_PER_RUN);

  if (listError) {
    console.error("sync-team-squads: failed to list teams", listError);
    return new Response(JSON.stringify({ error: listError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = { updated: 0, failed: 0, errors: [] as Array<{ team: string; error: string }> };

  for (const row of teams ?? []) {
    try {
      const [squadPlayers, coach] = await Promise.all([
        fetchSquadByTeamId(row.api_team_id, API_FOOTBALL_KEY),
        fetchCurrentCoach(row.api_team_id, API_FOOTBALL_KEY),
      ]);

      if (squadPlayers.length === 0) {
        throw new Error("empty squad response");
      }

      const { error: updateError } = await supabase
        .from("team_squads")
        .update({
          players: mapSquadPlayers(squadPlayers),
          coach,
          source: "api-football",
          fetched_at: new Date().toISOString(),
        })
        .eq("api_team_id", row.api_team_id);

      if (updateError) throw updateError;

      results.updated++;
    } catch (error) {
      results.failed++;
      const message = error instanceof Error ? error.message : String(error);
      results.errors.push({ team: row.team_name, error: message });
      console.error(`sync-team-squads: failed for ${row.team_name}`, message);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log("sync-team-squads finished", results);

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
