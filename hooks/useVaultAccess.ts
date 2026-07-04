import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'drill-vault-subscription';

/** Free tier keeps this many saved drills; Pro is unlimited. */
export const FREE_SAVED_DRILL_LIMIT = 5;

export type VaultPlan = 'monthly' | 'yearly';

export interface VaultSubscription {
  plan: VaultPlan;
  startedAt: number;
}

export const VAULT_PLANS: { id: VaultPlan; label: string; price: string; note?: string }[] = [
  { id: 'monthly', label: 'Monthly', price: '$4.99/mo' },
  { id: 'yearly', label: 'Yearly', price: '$39.99/yr', note: 'Save 33%' },
];

export function useVaultAccess() {
  const [subscription, setSubscription] = useState<VaultSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isMounted && stored) {
          setSubscription(JSON.parse(stored) as VaultSubscription);
        }
      })
      .catch((error) => {
        console.error('Failed to load vault subscription:', error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ponytail: simulated purchase — a sideloaded APK can't reach Play Billing.
  // Swap this body for react-native-purchases / Play Billing before store release.
  const subscribe = useCallback(async (plan: VaultPlan) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const next: VaultSubscription = { plan, startedAt: Date.now() };
    setSubscription(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }, []);

  const cancel = useCallback(async () => {
    setSubscription(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isSubscribed: subscription !== null,
    subscription,
    isLoading,
    subscribe,
    cancel,
  };
}
