import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
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
  screen: string;
  setScreen: (s: string) => void;
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
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [match, setMatch] = useState<Match>(() => {
    const matches = loadMatches();
    return matches.length > 0 ? matches[0] : newMatchData();
  });

  const [liveState, setLiveState] = useState<LiveState | null>(() => {
    const saved = loadLive();
    if (saved && saved.matchId === match.id && saved.state) return saved.state;
    return null;
  });

  const [screen, setScreenState] = useState<string>(() => {
    const saved = loadLive();
    if (saved && saved.matchId === match.id && saved.state) return 'live';
    return 'setup';
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

  const setScreen = useCallback((s: string) => {
    setScreenState(s);
  }, []);

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
    setScreen('live');
  }, [match, setScreen]);

  const resetLive = useCallback(() => {
    if (!window.confirm('Reiniciar a transmissão? Substituições e eventos serão perdidos.')) return;
    setLiveState(null);
    clearLiveLS();
    // Then start fresh
    setTimeout(() => startLive(), 0);
  }, [startLive]);

  const newMatchFn = useCallback(() => {
    if (!window.confirm('Limpar todos os dados e criar uma nova partida?')) return;
    setLiveState(null);
    clearLiveLS();
    const m = newMatchData();
    setMatch(m);
    saveMatchesToLS([m]);
    setScreen('setup');
  }, [setScreen]);

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
          setScreen('setup');
        } else {
          alert('Arquivo inválido.');
        }
      } catch (err: any) {
        alert('Erro: ' + err.message);
      }
    };
    reader.readAsText(file);
  }, [setScreen]);

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
      match, setMatch, liveState, setLiveState, screen, setScreen,
      showSubs, setShowSubs, showCur, setShowCur, curTab, setCurTab,
      liveView, setLiveView, saveMatch, saveLiveState,
      startLive, resetLive, newMatch: newMatchFn, exportMatch: exportMatchFn,
      importMatch: importMatchFn, savedIndicator
    }}>
      {children}
    </AppContext.Provider>
  );
}
