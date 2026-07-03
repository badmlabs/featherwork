import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StepSet } from '../types/drill';

const STORAGE_KEY = 'badminton-step-sets';

export function useStepSets() {
  const [stepSets, setStepSets] = useState<StepSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadStepSets = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return;

        if (stored) {
          setStepSets(JSON.parse(stored) as StepSet[]);
        }
      } catch (error) {
        console.error('Failed to load step sets:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStepSets();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistStepSets = useCallback(async (nextStepSets: StepSet[]) => {
    setStepSets(nextStepSets);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStepSets));
  }, []);

  const saveStepSet = useCallback(async (stepSet: StepSet) => {
    const nextStepSets = [stepSet, ...stepSets.filter((existing) => existing.id !== stepSet.id)];
    await persistStepSets(nextStepSets);
    return stepSet;
  }, [persistStepSets, stepSets]);

  const deleteStepSet = useCallback(async (id: string) => {
    const nextStepSets = stepSets.filter((stepSet) => stepSet.id !== id);
    await persistStepSets(nextStepSets);
  }, [persistStepSets, stepSets]);

  const importStepSet = useCallback(async (stepSet: StepSet) => {
    const existing = stepSets.find((item) => item.id === stepSet.id);
    if (existing) {
      return existing;
    }

    await saveStepSet(stepSet);
    return stepSet;
  }, [saveStepSet, stepSets]);

  return {
    stepSets,
    isLoading,
    saveStepSet,
    deleteStepSet,
    importStepSet,
  };
}
