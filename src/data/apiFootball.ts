import { Player } from './types';
import { supabase } from '@/integrations/supabase/client';

export interface SquadResult {
  starters: Player[];
  reserves: Player[];
  coach: string;
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
  };
}
