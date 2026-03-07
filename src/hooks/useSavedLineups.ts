import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface SavedLineupPlayer {
  number: string;
  name: string;
}

interface SavedLineup {
  id: string;
  team_name: string;
  team_name_normalized: string;
  players: SavedLineupPlayer[];
}

function normalizeTeamName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function useSavedLineups() {
  const { user } = useAuth();
  const [lineups, setLineups] = useState<SavedLineup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLineups = useCallback(async () => {
    if (!user) { setLineups([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_lineups')
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      setLineups(data.map(d => ({
        id: d.id,
        team_name: d.team_name,
        team_name_normalized: d.team_name_normalized,
        players: (d.players as any[]) || [],
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLineups(); }, [fetchLineups]);

  const findByTeamName = useCallback((teamName: string): SavedLineup | undefined => {
    const normalized = normalizeTeamName(teamName);
    return lineups.find(l => l.team_name_normalized === normalized);
  }, [lineups]);

  const saveLineup = useCallback(async (teamName: string, players: SavedLineupPlayer[]) => {
    if (!user) return null;
    const normalized = normalizeTeamName(teamName);
    const existing = findByTeamName(teamName);

    if (existing) {
      const { data, error } = await supabase
        .from('saved_lineups')
        .update({ players: players as any, team_name: teamName })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (!error) await fetchLineups();
      return data;
    } else {
      const { data, error } = await supabase
        .from('saved_lineups')
        .insert({
          user_id: user.id,
          team_name: teamName,
          team_name_normalized: normalized,
          players: players as any,
        })
        .select()
        .single();
      if (!error) await fetchLineups();
      return data;
    }
  }, [user, findByTeamName, fetchLineups]);

  return { lineups, loading, findByTeamName, saveLineup, refetch: fetchLineups };
}
