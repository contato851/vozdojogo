import { Player } from './types';

const API_KEY = '76323e8a785b9405b7c311d10f76a969';
const TEAM_ID_CACHE = 'vdj-api-football-ids';
const BASE_URL = 'https://v3.football.api-sports.io';

function getTeamIdCache(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TEAM_ID_CACHE) || '{}');
  } catch { return {}; }
}

function setTeamIdCache(cache: Record<string, number>) {
  localStorage.setItem(TEAM_ID_CACHE, JSON.stringify(cache));
}

async function apiFetch(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY }
  });

  if (res.status === 403) throw new Error('Chave da API inválida');
  if (res.status === 429) throw new Error('Limite de requisições atingido (100/dia)');
  if (!res.ok) throw new Error(`Erro na API: ${res.status}`);

  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    const errMsg = Object.values(data.errors).join(', ');
    throw new Error(`Erro: ${errMsg}`);
  }
  return data;
}

// Search for a team by name and return its API-Football ID
async function findTeamId(teamName: string): Promise<number> {
  const cache = getTeamIdCache();
  if (cache[teamName]) return cache[teamName];

  // Clean the name for search
  const searchName = teamName
    .replace(/-[A-Z]{2}$/, '') // Remove state suffix like -SP, -RJ
    .replace(/^ATLÉTICO$/, 'Atletico')
    .trim();

  const data = await apiFetch('teams', { search: searchName, country: 'Brazil' });

  if (!data.response || data.response.length === 0) {
    // Try without country filter for national teams
    const data2 = await apiFetch('teams', { search: searchName });
    if (!data2.response || data2.response.length === 0) {
      throw new Error(`Time "${teamName}" não encontrado na API`);
    }
    const teamId = data2.response[0].team.id;
    cache[teamName] = teamId;
    setTeamIdCache(cache);
    return teamId;
  }

  const teamId = data.response[0].team.id;
  cache[teamName] = teamId;
  setTeamIdCache(cache);
  return teamId;
}

export interface SquadResult {
  starters: Player[];
  reserves: Player[];
  coach: string;
}

export async function fetchSquad(teamName: string): Promise<SquadResult> {
  const teamId = await findTeamId(teamName);
  const data = await apiFetch('players/squads', { team: teamId.toString() });

  if (!data.response || data.response.length === 0) {
    throw new Error('Elenco não disponível para este time');
  }

  const squad = data.response[0];
  const allPlayers: Array<{ id: number; name: string; number: number | null; position: string }> = squad.players || [];

  // Separate by position - Goalkeepers first, then Defenders, Midfielders, Attackers
  const positionOrder: Record<string, number> = {
    'Goalkeeper': 0,
    'Defender': 1,
    'Midfielder': 2,
    'Attacker': 3
  };

  const sorted = [...allPlayers].sort((a, b) => {
    const posA = positionOrder[a.position] ?? 4;
    const posB = positionOrder[b.position] ?? 4;
    if (posA !== posB) return posA - posB;
    return (a.number || 99) - (b.number || 99);
  });

  // First 11 as starters (1 GK, typical formation), rest as reserves
  const starters: Player[] = sorted.slice(0, 11).map((p, i) => ({
    id: `s-${i}`,
    number: p.number?.toString() || '',
    name: formatName(p.name),
  }));

  const reserves: Player[] = sorted.slice(11).map((p, i) => ({
    id: `r-${i}`,
    number: p.number?.toString() || '',
    name: formatName(p.name),
  }));

  // Try to get coach
  let coach = '';
  try {
    const coachData = await apiFetch('coachs', { team: teamId.toString() });
    if (coachData.response && coachData.response.length > 0) {
      // Find current coach (no end date)
      const current = coachData.response.find((c: any) =>
        c.career?.some((car: any) => car.team?.id === teamId && !car.end)
      );
      if (current) coach = current.name;
      else coach = coachData.response[0].name;
    }
  } catch {
    // Coach fetch is optional
  }

  return { starters, reserves, coach };
}

function formatName(name: string): string {
  // API returns "Firstname Lastname", we want uppercase last name or short name
  // Many Brazilian players use a single name
  const parts = name.split(' ');
  if (parts.length <= 2) return name.toUpperCase();
  // Use last name for longer names
  return parts[parts.length - 1].toUpperCase();
}
