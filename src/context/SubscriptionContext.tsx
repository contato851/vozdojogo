import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface SubscriptionState {
  subscribed: boolean;
  loading: boolean;
  gracePeriod: boolean;
  graceDaysRemaining: number;
  subscriptionEnd: string | null;
  subscriptionStatus: string | null;
  checkSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
  cancelSubscription: () => Promise<{ error: string | null }>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be inside SubscriptionProvider');
  return ctx;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gracePeriod, setGracePeriod] = useState(false);
  const [graceDaysRemaining, setGraceDaysRemaining] = useState(0);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setSubscribed(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;

      setSubscribed(data?.subscribed ?? false);
      setGracePeriod(data?.grace_period ?? false);
      setGraceDaysRemaining(data?.grace_days_remaining ?? 0);
      setSubscriptionEnd(data?.subscription_end ?? null);
      setSubscriptionStatus(data?.status ?? null);
    } catch (err) {
      console.error('Check subscription error:', err);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
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

  const cancelSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error) {
        let serverMessage: string | null = null;
        try {
          const body = await (error as any).context?.json?.();
          serverMessage = body?.error ?? null;
        } catch { /* body wasn't JSON or already consumed */ }
        throw new Error(serverMessage || error.message);
      }
      if (data?.error) throw new Error(data.error);
      await checkSubscription();
      return { error: null };
    } catch (err: any) {
      console.error('Cancel subscription error:', err);
      return { error: err?.message || 'Não foi possível cancelar a assinatura.' };
    }
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{
      subscribed, loading, gracePeriod, graceDaysRemaining,
      subscriptionEnd, subscriptionStatus, checkSubscription, startCheckout, cancelSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
