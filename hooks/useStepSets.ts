import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StepSet } from '../types/drill';
import { appAlert } from '../utils/appAlert';

const STORAGE_KEY = 'badminton-step-sets';
const STEP_SET_LIMIT = 5;

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

  const writeToStorage = (nextStepSets: StepSet[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStepSets)).catch((error) => {
      console.error('Failed to save step sets:', error);
    });
  };

  // saveStepSet gates on the current list for the cap, so unlike the others
  // it changes identity when the list does; callers already tolerate that.
  // Returns null (after alerting) when the limit is hit.
  const saveStepSet = useCallback(async (stepSet: StepSet) => {
    const isUpdate = stepSets.some((existing) => existing.id === stepSet.id);
    if (!isUpdate && stepSets.length >= STEP_SET_LIMIT) {
      appAlert(
        'Drill limit reached',
        `Up to ${STEP_SET_LIMIT} drills can be saved. Delete one to make room.`
      );
      return null;
    }
    setStepSets((prev) => {
      const next = [stepSet, ...prev.filter((existing) => existing.id !== stepSet.id)];
      writeToStorage(next);
      return next;
    });
    return stepSet;
  }, [stepSets]);

  // Functional updates keep the remaining callbacks stable across renders.
  const deleteStepSet = useCallback(async (id: string) => {
    setStepSets((prev) => {
      const next = prev.filter((stepSet) => stepSet.id !== id);
      writeToStorage(next);
      return next;
    });
  }, []);

  const replaceStepSet = useCallback(async (existingId: string, stepSet: StepSet) => {
    setStepSets((prev) => {
      const next = [
        stepSet,
        ...prev.filter((item) => item.id !== existingId && item.id !== stepSet.id),
      ];
      writeToStorage(next);
      return next;
    });
    return stepSet;
  }, []);

  const importStepSet = useCallback(
    async (stepSet: StepSet) => saveStepSet(stepSet),
    [saveStepSet]
  );

  return {
    stepSets,
    isLoading,
    saveStepSet,
    deleteStepSet,
    replaceStepSet,
    importStepSet,
  };
}
