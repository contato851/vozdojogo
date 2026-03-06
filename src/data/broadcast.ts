import { supabase } from '@/integrations/supabase/client';
import { LiveState } from './types';

let currentBroadcastId: string | null = null;
let currentShareCode: string | null = null;

export async function createBroadcast(matchData: any): Promise<string> {
  const { data, error } = await supabase
    .from('live_broadcasts')
    .insert({ match_data: matchData, state: {}, is_active: true })
    .select('id, share_code')
    .single();

  if (error) throw error;
  currentBroadcastId = data.id;
  currentShareCode = data.share_code;
  return data.share_code;
}

export async function updateBroadcastState(state: LiveState, matchData?: any) {
  if (!currentBroadcastId) return;
  const update: any = { state: state as any };
  if (matchData) update.match_data = matchData;
  await supabase
    .from('live_broadcasts')
    .update(update)
    .eq('id', currentBroadcastId);
}

export async function stopBroadcast() {
  if (!currentBroadcastId) return;
  await supabase
    .from('live_broadcasts')
    .update({ is_active: false })
    .eq('id', currentBroadcastId);
  currentBroadcastId = null;
  currentShareCode = null;
}

export function getCurrentShareCode() {
  return currentShareCode;
}

export function getCurrentBroadcastId() {
  return currentBroadcastId;
}

export function setCurrentBroadcast(id: string, code: string) {
  currentBroadcastId = id;
  currentShareCode = code;
}

export async function fetchBroadcast(shareCode: string) {
  const { data, error } = await supabase
    .from('live_broadcasts')
    .select('*')
    .eq('share_code', shareCode)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToBroadcast(shareCode: string, onUpdate: (state: any, matchData: any) => void) {
  const channel = supabase
    .channel(`broadcast-${shareCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_broadcasts',
        filter: `share_code=eq.${shareCode}`,
      },
      (payload) => {
        const row = payload.new as any;
        onUpdate(row.state, row.match_data);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
