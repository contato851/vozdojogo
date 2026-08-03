import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface OverridePlayerInput {
  number: string;
  name: string;
}

export function useSquadOverrides() {
  const { user } = useAuth();

  const addPlayer = useCallback(async (apiTeamId: number, player: OverridePlayerInput) => {
    if (!user) throw new Error('Faça login para sugerir uma alteração no elenco.');

    const { error } = await supabase.from('squad_overrides').insert({
      api_team_id: apiTeamId,
      action: 'add',
      player_data: {
        number: String(player.number || '').trim(),
        name: String(player.name || '').trim().toUpperCase(),
        position: '',
        age: null,
        photo: '',
      },
      status: 'suggested',
      created_by: user.id,
    });

    if (error) throw error;
  }, [user]);

  const deactivatePlayer = useCallback(async (apiTeamId: number, playerId: string) => {
    if (!user) throw new Error('Faça login para sugerir uma alteração no elenco.');

    const { error } = await supabase.from('squad_overrides').insert({
      api_team_id: apiTeamId,
      action: 'deactivate',
      player_id: playerId,
      status: 'suggested',
      created_by: user.id,
    });

    if (error) throw error;
  }, [user]);

  return { addPlayer, deactivatePlayer };
}
