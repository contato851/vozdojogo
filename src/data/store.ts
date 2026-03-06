import { Match, Player, LiveState, SavedLive, Team } from './types';

const DB_KEY = 'vdj-matches';
const LIVE_KEY = 'vdj-live';

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function makeEmpty(n: number, prefix: string): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, number: '', name: '' }));
}

export function sortByNumber(arr: Player[]): Player[] {
  return [...arr].sort((a, b) => (parseInt(a.number) || 999) - (parseInt(b.number) || 999));
}

export function newMatchData(): Match {
  return {
    id: genId(),
    createdAt: new Date().toISOString(),
    stadium: '', referee: '', assistant1: '', assistant2: '', var_ref: '', reporter: '', commentators: '',
    sortOrder: 'number',
    teamA: { name: 'TIME A', coach: '', color: '#0a5c36', accent: '#ffd740', formation: '4-4-2', starters: makeEmpty(11, 'a-s'), reserves: makeEmpty(12, 'a-r'), unlisted: [], curiosities: '' },
    teamB: { name: 'TIME B', coach: '', color: '#cc0000', accent: '#ffd740', formation: '4-4-2', starters: makeEmpty(11, 'b-s'), reserves: makeEmpty(12, 'b-r'), unlisted: [], curiosities: '' },
  };
}

export function saveMatches(matches: Match[]) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(matches)); } catch (e) { /* ignore */ }
}

export function loadMatches(): Match[] {
  try {
    const d = localStorage.getItem(DB_KEY);
    if (d) return JSON.parse(d) || [];
  } catch (e) { /* ignore */ }
  return [];
}

export function saveLive(data: SavedLive) {
  try { localStorage.setItem(LIVE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

export function loadLive(): SavedLive | null {
  try {
    const d = localStorage.getItem(LIVE_KEY);
    if (d) return JSON.parse(d);
  } catch (e) { /* ignore */ }
  return null;
}

export function clearLive() {
  try { localStorage.removeItem(LIVE_KEY); } catch (e) { /* ignore */ }
}

export function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getClockElapsed(clock: { running: boolean; elapsed: number; startedAt: number | null }): number {
  if (clock.running && clock.startedAt) return clock.elapsed + (Date.now() - clock.startedAt);
  return clock.elapsed;
}

export function getClockMinute(clock: { running: boolean; elapsed: number; startedAt: number | null }): number {
  return Math.floor(getClockElapsed(clock) / 60000);
}

export function initPlayerEvents(players: Player[]): Player[] {
  return players.map(p => ({ ...p, yellowCards: 0, redCard: false, goals: 0 }));
}
