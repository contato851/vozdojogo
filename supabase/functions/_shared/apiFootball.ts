const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

export type ApiFootballSquadPlayer = {
  id: number;
  name: string;
  age?: number;
  number?: number | null;
  position?: string;
  photo?: string;
};

export type ApiFootballSquadResponse = {
  response: Array<{
    team: { id: number; name: string; logo?: string };
    players: ApiFootballSquadPlayer[];
  }>;
};

export type ApiFootballCoach = {
  name?: string;
  team?: { id: number };
};

export type MappedPlayer = {
  id: string;
  number: string;
  name: string;
  position: string;
  age: number | null;
  photo: string;
};

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function apiFootballFetch(path: string, apiKey: string) {
  const response = await fetch(`${API_FOOTBALL_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API_FOOTBALL_${response.status}:${text}`);
  }

  return response.json();
}

export async function fetchSquadByTeamId(teamId: number, apiKey: string): Promise<ApiFootballSquadPlayer[]> {
  const data = await apiFootballFetch(`/players/squads?team=${teamId}`, apiKey) as ApiFootballSquadResponse;
  return data?.response?.[0]?.players ?? [];
}

export async function fetchCurrentCoach(teamId: number, apiKey: string): Promise<string> {
  try {
    const data = await apiFootballFetch(`/coachs?team=${teamId}`, apiKey) as { response: ApiFootballCoach[] };
    const coach = data?.response?.[0];
    return coach?.name ?? "";
  } catch (error) {
    // Coach lookup failing shouldn't block the squad response.
    console.error("apiFootball coach lookup error:", error);
    return "";
  }
}

export function mapSquadPlayers(players: ApiFootballSquadPlayer[]): MappedPlayer[] {
  return players.map((p) => ({
    id: `af-${p.id}`,
    number: p.number != null ? String(p.number) : "",
    name: (p.name ?? "").toUpperCase(),
    position: p.position ?? "",
    age: p.age ?? null,
    photo: p.photo ?? "",
  }));
}
