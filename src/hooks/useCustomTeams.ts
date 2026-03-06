import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface CustomTeamPlayer {
  number: string;
  name: string;
}

export interface CustomTeam {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  accent: string;
  logo_url: string | null;
  players: CustomTeamPlayer[];
}

export function useCustomTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<CustomTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    if (!user) { setTeams([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('custom_teams')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTeams(data.map(d => ({
        id: d.id,
        name: d.name,
        abbreviation: d.abbreviation,
        color: d.color,
        accent: d.accent,
        logo_url: d.logo_url,
        players: (d.players as any[]) || [],
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const saveTeam = useCallback(async (team: Omit<CustomTeam, 'id'> & { id?: string }) => {
    if (!user) return null;
    if (team.id) {
      const { data, error } = await supabase
        .from('custom_teams')
        .update({
          name: team.name,
          abbreviation: team.abbreviation,
          color: team.color,
          accent: team.accent,
          logo_url: team.logo_url,
          players: team.players as any,
        })
        .eq('id', team.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (!error) await fetchTeams();
      return data;
    } else {
      const { data, error } = await supabase
        .from('custom_teams')
        .insert({
          user_id: user.id,
          name: team.name,
          abbreviation: team.abbreviation,
          color: team.color,
          accent: team.accent,
          logo_url: team.logo_url,
          players: team.players as any,
        })
        .select()
        .single();
      if (!error) await fetchTeams();
      return data;
    }
  }, [user, fetchTeams]);

  const deleteTeam = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('custom_teams').delete().eq('id', id).eq('user_id', user.id);
    await fetchTeams();
  }, [user, fetchTeams]);

  return { teams, loading, saveTeam, deleteTeam, refetch: fetchTeams };
}
