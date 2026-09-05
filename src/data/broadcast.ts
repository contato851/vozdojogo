import { supabase } from '@/integrations/supabase/client';
import { LiveState } from './types';

const STORAGE_KEY = 'vdj-broadcast';

function readStoredBroadcast(): { id: string; code: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const stored = readStoredBroadcast();
let currentBroadcastId: string | null = stored?.id ?? null;
let currentShareCode: string | null = stored?.code ?? null;

function persistBroadcast(id: string | null, code: string | null) {
  if (id && code) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, code }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function createBroadcast(matchData: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para compartilhar a transmissão.');

  const { data, error } = await supabase
    .from('live_broadcasts')
    .insert({ match_data: matchData, state: {}, is_active: true, user_id: user.id })
    .select('id, share_code')
    .single();

  if (error) throw error;
  currentBroadcastId = data.id;
  currentShareCode = data.share_code;
  persistBroadcast(data.id, data.share_code);
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
  persistBroadcast(null, null);
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
  persistBroadcast(id, code);
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
