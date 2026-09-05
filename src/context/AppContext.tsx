import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Match, LiveState, SavedLive, Player } from '../data/types';
import {
  genId, newMatchData, saveMatches as saveMatchesToLS, loadMatches, saveLive as saveLiveToLS,
  loadLive, clearLive as clearLiveLS, sortByNumber, initPlayerEvents, getClockElapsed, getClockMinute
} from '../data/store';

interface AppContextType {
  match: Match;
  setMatch: React.Dispatch<React.SetStateAction<Match>>;
  liveState: LiveState | null;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  showSubs: boolean;
  setShowSubs: React.Dispatch<React.SetStateAction<boolean>>;
  showCur: boolean;
  setShowCur: React.Dispatch<React.SetStateAction<boolean>>;
  curTab: string;
  setCurTab: React.Dispatch<React.SetStateAction<string>>;
  liveView: string;
  setLiveView: React.Dispatch<React.SetStateAction<string>>;
  saveMatch: () => void;
  saveLiveState: () => void;
  startLive: () => void;
  resetLive: () => void;
  newMatch: () => void;
  exportMatch: () => void;
  importMatch: (file: File) => void;
  savedIndicator: boolean;
  isDemo: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

// Patches name/number/coach corrections from `match` into an already-running
// `liveState` by player id, without touching goals/cards/subs/clock — so a
// typo fix in Escalação doesn't force a destructive "Reiniciar".
function patchPlayer<P extends Player>(p: P, byId: Map<string, Player>): P {
  const m = byId.get(p.id);
  if (!m || (m.name === p.name && m.number === p.number)) return p;
  return { ...p, name: m.name, number: m.number };
}

function patchList<P extends Player>(list: P[], byId: Map<string, Player>): P[] {
  let changed = false;
  const next = list.map(p => {
    const q = patchPlayer(p, byId);
    if (q !== p) changed = true;
    return q;
  });
  return changed ? next : list;
}

function syncLiveTeamFromMatch(matchTeam: Team, liveTeam: LiveTeam): LiveTeam {
  const pool = [...matchTeam.starters, ...matchTeam.reserves, ...(matchTeam.unlisted || [])];
  const byId = new Map(pool.map(p => [p.id, p]));
  const starters = patchList(liveTeam.starters, byId);
  const reserves = patchList(liveTeam.reserves, byId);
  const subsOut = patchList(liveTeam.subsOut, byId);
  const coachChanged = matchTeam.coach !== liveTeam.coach;
  if (starters === liveTeam.starters && reserves === liveTeam.reserves && subsOut === liveTeam.subsOut && !coachChanged) {
    return liveTeam;
  }
  return { ...liveTeam, coach: matchTeam.coach, starters, reserves, subsOut };
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function AppProvider({ children, basePath = '' }: { children: React.ReactNode; basePath?: string }) {
  const navigate = useNavigate();

  const [match, setMatch] = useState<Match>(() => {
    const matches = loadMatches();
    return matches.length > 0 ? matches[0] : newMatchData();
  });

  const [liveState, setLiveState] = useState<LiveState | null>(() => {
    const saved = loadLive();
    if (saved && saved.matchId === match.id && saved.state) return saved.state;
    return null;
  });

  const [showSubs, setShowSubs] = useState(() => { const s = loadLive(); return s?.showSubs || false; });
  const [showCur, setShowCur] = useState(() => { const s = loadLive(); return s?.showCur || false; });
  const [curTab, setCurTab] = useState(() => { const s = loadLive(); return s?.curTab || 'a'; });
  const [liveView, setLiveView] = useState(() => { const s = loadLive(); return s?.liveView || 'list'; });
  const [savedIndicator, setSavedIndicator] = useState(false);
  const savedTimeout = useRef<number>();

  const showSaved = useCallback(() => {
    setSavedIndicator(true);
    clearTimeout(savedTimeout.current);
    savedTimeout.current = window.setTimeout(() => setSavedIndicator(false), 1200);
  }, []);

  const saveMatch = useCallback(() => {
    saveMatchesToLS([match]);
    showSaved();
  }, [match, showSaved]);

  // Auto-save match on change
  useEffect(() => {
    saveMatchesToLS([match]);
  }, [match]);

  const saveLiveState = useCallback(() => {
    if (!liveState) return;
    saveLiveToLS({ matchId: match.id, state: liveState, showSubs, showCur, curTab, liveView });
    showSaved();
  }, [liveState, match.id, showSubs, showCur, curTab, liveView, showSaved]);

  // Auto-save live state on change
  useEffect(() => {
    if (liveState) {
      saveLiveToLS({ matchId: match.id, state: liveState, showSubs, showCur, curTab, liveView });
    }
  }, [liveState, match.id, showSubs, showCur, curTab, liveView]);

  // Non-destructive sync: a name/number/coach correction made in Escalação
  // after transmission has started propagates into the live squad by player
  // id, leaving goals/cards/subs/clock untouched (unlike resetLive).
  useEffect(() => {
    setLiveState(prev => {
      if (!prev) return prev;
      const teamA = syncLiveTeamFromMatch(match.teamA, prev.teamA);
      const teamB = syncLiveTeamFromMatch(match.teamB, prev.teamB);
      if (teamA === prev.teamA && teamB === prev.teamB) return prev;
      return { ...prev, teamA, teamB };
    });
  }, [match]);

  const startLive = useCallback(() => {
    const doSort = match.sortOrder !== 'manual';
    const prep = (arr: Player[]) => {
      const filtered = initPlayerEvents(arr.filter(p => p.name.trim()));
      return doSort ? sortByNumber(filtered) : filtered;
    };
    const newLive: LiveState = {
      sortOrder: match.sortOrder || 'number',
      goalLog: [],
      fieldPos: {},
      fieldFlipped: false,
      clock: { running: false, elapsed: 0, startedAt: null },
      teamA: { ...match.teamA, starters: prep(match.teamA.starters), reserves: sortByNumber(initPlayerEvents(match.teamA.reserves.filter(p => p.name.trim()))), subsOut: [] },
      teamB: { ...match.teamB, starters: prep(match.teamB.starters), reserves: sortByNumber(initPlayerEvents(match.teamB.reserves.filter(p => p.name.trim()))), subsOut: [] },
    };
    setLiveState(newLive);
    setShowSubs(false);
    setShowCur(false);
    navigate(`${basePath}/ao-vivo`);
  }, [match, navigate, basePath]);

  const resetLive = useCallback(() => {
    if (!window.confirm('Reiniciar a transmissão? Substituições e eventos serão perdidos.')) return;
    setLiveState(null);
    clearLiveLS();
    setTimeout(() => startLive(), 0);
  }, [startLive]);

  const newMatchFn = useCallback(() => {
    if (!window.confirm('Limpar todos os dados e criar uma nova partida?')) return;
    setLiveState(null);
    clearLiveLS();
    const m = newMatchData();
    setMatch(m);
    saveMatchesToLS([m]);
    navigate(`${basePath}/escalacao`);
  }, [navigate, basePath]);

  const exportMatchFn = useCallback(() => {
    const name = `${match.teamA.name || 'TimeA'} x ${match.teamB.name || 'TimeB'}.json`;
    const blob = new Blob([JSON.stringify(match, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [match]);

  const importMatchFn = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed && parsed.teamA && parsed.teamB) {
          parsed.id = genId();
          parsed.createdAt = parsed.createdAt || new Date().toISOString();
          setLiveState(null);
          clearLiveLS();
          setMatch(parsed);
          saveMatchesToLS([parsed]);
          navigate(`${basePath}/escalacao`);
        } else {
          alert('Arquivo inválido.');
        }
      } catch (err: any) {
        alert('Erro: ' + err.message);
      }
    };
    reader.readAsText(file);
  }, [navigate, basePath]);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (liveState) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [liveState]);

  return (
    <AppContext.Provider value={{
      match, setMatch, liveState, setLiveState,
      showSubs, setShowSubs, showCur, setShowCur, curTab, setCurTab,
      liveView, setLiveView, saveMatch, saveLiveState,
      startLive, resetLive, newMatch: newMatchFn, exportMatch: exportMatchFn,
      importMatch: importMatchFn, savedIndicator, isDemo: basePath === '/demo'
    }}>
      {children}
    </AppContext.Provider>
  );
}
