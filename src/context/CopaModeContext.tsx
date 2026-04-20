import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type AppMode = 'normal' | 'copa' | null;

const STORAGE_KEY = 'vdj-mode';

interface CopaModeContextType {
  mode: AppMode;
  setMode: (m: Exclude<AppMode, null>) => void;
  resetMode: () => void;
}

const CopaModeContext = createContext<CopaModeContextType | null>(null);

export function useCopaMode() {
  const ctx = useContext(CopaModeContext);
  if (!ctx) throw new Error('useCopaMode must be used inside CopaModeProvider');
  return ctx;
}

function readStoredMode(): AppMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'normal' || v === 'copa') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function CopaModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => readStoredMode());

  useEffect(() => {
    try {
      if (mode) localStorage.setItem(STORAGE_KEY, mode);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const setMode = useCallback((m: Exclude<AppMode, null>) => setModeState(m), []);
  const resetMode = useCallback(() => setModeState(null), []);

  return (
    <CopaModeContext.Provider value={{ mode, setMode, resetMode }}>
      {children}
    </CopaModeContext.Provider>
  );
}
