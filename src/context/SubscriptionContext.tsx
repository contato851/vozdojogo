import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface SubscriptionState {
  subscribed: boolean;
  loading: boolean;
  gracePeriod: boolean;
  graceDaysRemaining: number;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be inside SubscriptionProvider');
  return ctx;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // TODO: remover bypass após testes
  const [subscribed, setSubscribed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gracePeriod, setGracePeriod] = useState(false);
  const [graceDaysRemaining, setGraceDaysRemaining] = useState(0);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    // TODO: remover bypass após testes — mantém subscribed=true sempre
    return;
  }, [user]);

  useEffect(() => {
    if (user) {
      checkSubscription();
      const interval = setInterval(checkSubscription, 60000);
      return () => clearInterval(interval);
    } else {
      setSubscribed(false);
      setLoading(false);
    }
  }, [user, checkSubscription]);

  const startCheckout = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      console.error('Checkout error:', err);
    }
  }, []);

  const openPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      console.error('Portal error:', err);
    }
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscribed, loading, gracePeriod, graceDaysRemaining,
      subscriptionEnd, checkSubscription, startCheckout, openPortal
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
