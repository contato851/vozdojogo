import React, { createContext, useContext, useState, useCallback } from 'react';

export interface OnboardingData {
  narrationTypes: string[];
  frequency: string;
  level: string;
  mainDifficulty: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  setNarrationTypes: (types: string[]) => void;
  setFrequency: (freq: string) => void;
  setLevel: (level: string) => void;
  setMainDifficulty: (diff: string) => void;
  clearOnboarding: () => void;
}

const STORAGE_KEY = 'vdj-onboarding';

function loadOnboarding(): OnboardingData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { narrationTypes: [], frequency: '', level: '', mainDifficulty: '' };
}

function saveOnboarding(data: OnboardingData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingProvider');
  return ctx;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(loadOnboarding);

  const update = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => {
      const next = { ...prev, ...partial };
      saveOnboarding(next);
      return next;
    });
  }, []);

  const setNarrationTypes = useCallback((types: string[]) => update({ narrationTypes: types }), [update]);
  const setFrequency = useCallback((freq: string) => update({ frequency: freq }), [update]);
  const setLevel = useCallback((level: string) => update({ level: level }), [update]);
  const setMainDifficulty = useCallback((diff: string) => update({ mainDifficulty: diff }), [update]);
  const clearOnboarding = useCallback(() => {
    const empty = { narrationTypes: [], frequency: '', level: '', mainDifficulty: '' };
    setData(empty);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return (
    <OnboardingContext.Provider value={{ data, setNarrationTypes, setFrequency, setLevel, setMainDifficulty, clearOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}
