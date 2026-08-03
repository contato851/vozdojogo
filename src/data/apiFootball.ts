import { Player } from './types';
import { supabase } from '@/integrations/supabase/client';

export interface SquadResult {
  starters: Player[];
  reserves: Player[];
  coach: string;
  apiTeamId: number | null;
  warning?: string;
}

export async function fetchSquad(teamName: string): Promise<SquadResult> {
  const { data, error } = await supabase.functions.invoke('fetch-squad', {
    body: { teamName },
  });

  if (error) {
    console.error('fetch-squad error:', error);
    throw new Error(error.message || 'Erro ao buscar elenco');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    starters: (data.starters || []) as Player[],
    reserves: (data.reserves || []) as Player[],
    coach: data.coach || '',
    apiTeamId: data.apiTeamId ?? null,
    warning: data.warning || undefined,
  };
}

export interface TeamMappingInfo {
  hasAutoSquad: boolean;
}

// Lets the UI know, before fetching anything, whether this team has a
// reviewed API-Football mapping — used to offer (or skip) the "usar
// escalação sugerida" choice.
export async function checkTeamMapping(teamName: string): Promise<TeamMappingInfo> {
  const { data } = await supabase
    .from('team_api_mappings')
    .select('api_football_team_id')
    .eq('app_team_name', teamName)
    .maybeSingle();

  return { hasAutoSquad: !!(data && data.api_football_team_id != null) };
}
