import { useCallback, useState, useEffect, useMemo } from 'react';
import { TeamPositions, CourtDimensions, PlayerPosition } from '../types/game';
import { DrillStep } from '../types/steps';
import { getInitialPositions, getInitialShuttle } from '../utils/courtPositions';

interface GhostPosition {
  team1: PlayerPosition[];
  team2: PlayerPosition[];
  shuttle: PlayerPosition;
}

interface PositionState {
  players: TeamPositions;
  shuttle: PlayerPosition;
  ghostPositions: GhostPosition;
}

function cloneTeam(team: PlayerPosition[]): PlayerPosition[] {
  return team.map((p) => ({ x: p.x, y: p.y }));
}

function drillStepToPositionState(step: DrillStep, previous?: DrillStep): PositionState {
  const ghostSource = previous ?? step;
  return {
    players: {
      team1: cloneTeam(step.players.team1),
      team2: cloneTeam(step.players.team2),
    },
    shuttle: { ...step.shuttle },
    ghostPositions: {
      team1: cloneTeam(ghostSource.players.team1),
      team2: cloneTeam(ghostSource.players.team2),
      shuttle: { ...ghostSource.shuttle },
    },
  };
}

export function useCourtPositions(courtDimensions: CourtDimensions) {
  const [isDoubles, setIsDoubles] = useState(true);
  const [showPlayerTrails, setShowPlayerTrails] = useState(true);
  const [showShuttleTrail, setShowShuttleTrail] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [positionHistory, setPositionHistory] = useState<PositionState[]>([]);
  const [tempPosition, setTempPosition] = useState<PositionState | null>(null);

  useEffect(() => {
    const initialPlayers = getInitialPositions(isDoubles, courtDimensions);
    const initialShuttle = getInitialShuttle(courtDimensions);
    const initialState = {
      players: initialPlayers,
      shuttle: initialShuttle,
      ghostPositions: {
        team1: [...initialPlayers.team1],
        team2: [...initialPlayers.team2],
        shuttle: initialShuttle,
      },
    };
    setPositionHistory([initialState]);
  }, []);

  const updatePosition = useCallback((
    newState: Pick<PositionState, 'players' | 'shuttle'>,
    currentState: PositionState,
    team?: 'team1' | 'team2',
    index?: number,
    isShuttle: boolean = false,
    isStart: boolean = false
  ) => {
    if (isStart) {
      const ghostPositions = {
        team1: [...currentState.ghostPositions.team1],
        team2: [...currentState.ghostPositions.team2],
        shuttle: currentState.ghostPositions.shuttle,
      };

      if (team && typeof index === 'number') {
        ghostPositions[team][index] = currentState.players[team][index];
      } else if (isShuttle) {
        ghostPositions.shuttle = currentState.shuttle;
      }

      setTempPosition({
        ...newState,
        ghostPositions,
      });
    } else {
      setTempPosition(prevTemp => ({
        ...newState,
        ghostPositions: prevTemp?.ghostPositions || currentState.ghostPositions,
      }));
    }
  }, []);

  const updatePlayerPosition = useCallback((
    team: 'team1' | 'team2',
    index: number,
    newPosition: PlayerPosition,
    isStart: boolean = false
  ) => {
    const currentState = positionHistory[currentIndex];
    const newPlayers = {
      ...currentState.players,
      [team]: currentState.players[team].map((pos, i) =>
        i === index ? newPosition : pos
      ),
    };

    updatePosition({
      players: newPlayers,
      shuttle: currentState.shuttle,
    }, currentState, team, index, false, isStart);
  }, [currentIndex, positionHistory, updatePosition]);

  const updateShuttlePosition = useCallback((
    newPosition: PlayerPosition,
    isStart: boolean = false
  ) => {
    const currentState = positionHistory[currentIndex];
    updatePosition({
      players: currentState.players,
      shuttle: newPosition,
    }, currentState, undefined, undefined, true, isStart);
  }, [currentIndex, positionHistory, updatePosition]);

  const handlePositionChangeComplete = useCallback(() => {
    if (!tempPosition) return;

    setPositionHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      return [...newHistory, {
        ...tempPosition,
        ghostPositions: tempPosition.ghostPositions,
      }];
    });
    setCurrentIndex(prev => prev + 1);
    setTempPosition(null);
  }, [currentIndex, tempPosition]);

  const resetPositions = useCallback(() => {
    const initialPlayers = getInitialPositions(isDoubles, courtDimensions);
    const initialShuttle = getInitialShuttle(courtDimensions);
    const initialState = {
      players: initialPlayers,
      shuttle: initialShuttle,
      ghostPositions: {
        team1: [...initialPlayers.team1],
        team2: [...initialPlayers.team2],
        shuttle: initialShuttle,
      },
    };
    setPositionHistory([initialState]);
    setCurrentIndex(0);
  }, [isDoubles, courtDimensions]);

  const toggleGameMode = useCallback((value: boolean) => {
    setIsDoubles(value);
    const initialPlayers = getInitialPositions(value, courtDimensions);
    const initialShuttle = getInitialShuttle(courtDimensions);
    const initialState = {
      players: initialPlayers,
      shuttle: initialShuttle,
      ghostPositions: {
        team1: [...initialPlayers.team1],
        team2: [...initialPlayers.team2],
        shuttle: initialShuttle,
      },
    };
    setPositionHistory([initialState]);
    setCurrentIndex(0);
  }, [courtDimensions]);

  const undo = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < positionHistory.length - 1) setCurrentIndex(prev => prev + 1);
  }, [currentIndex, positionHistory.length]);

  const togglePlayerTrails = useCallback(() => {
    setShowPlayerTrails(prev => !prev);
  }, []);


  const demoAddCourtStep = useCallback(() => {
    const current = positionHistory[currentIndex];
    if (!current) return;
    const offset = positionHistory.length * 15;
    const next = {
      players: {
        team1: current.players.team1.map((pos) => ({ x: pos.x + offset, y: pos.y + offset * 0.5 })),
        team2: current.players.team2.map((pos) => ({ x: pos.x - offset * 0.5, y: pos.y + offset })),
      },
      shuttle: { x: current.shuttle.x + offset * 0.8, y: current.shuttle.y - offset * 0.3 },
    };
    const newState = drillStepToPositionState(next, {
      players: current.players,
      shuttle: current.shuttle,
    });
    setPositionHistory((prev) => [...prev, newState]);
    setCurrentIndex((prev) => prev + 1);
    setTempPosition(null);
  }, [currentIndex, positionHistory]);

  useEffect(() => {
    if (typeof globalThis !== 'undefined' && __DEV__) {
      (globalThis as { __demoAddCourtStep?: () => void }).__demoAddCourtStep = demoAddCourtStep;
      return () => {
        delete (globalThis as { __demoAddCourtStep?: () => void }).__demoAddCourtStep;
      };
    }
  }, [demoAddCourtStep]);

  const toggleShuttleTrail = useCallback(() => {
    setShowShuttleTrail(prev => !prev);
  }, []);

  const drillSteps = useMemo<DrillStep[]>(
    () =>
      positionHistory.map((state) => ({
        players: {
          team1: cloneTeam(state.players.team1),
          team2: cloneTeam(state.players.team2),
        },
        shuttle: { ...state.shuttle },
      })),
    [positionHistory]
  );

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= positionHistory.length) return;
      setCurrentIndex(index);
      setTempPosition(null);
    },
    [positionHistory.length]
  );

  const importDrill = useCallback((steps: DrillStep[], isDoublesMode: boolean) => {
    if (steps.length === 0) return;
    setIsDoubles(isDoublesMode);
    const history = steps.map((step, index) =>
      drillStepToPositionState(step, index > 0 ? steps[index - 1] : step)
    );
    setPositionHistory(history);
    setCurrentIndex(history.length - 1);
    setTempPosition(null);
  }, []);

  return {
    isDoubles,
    playerPositions: tempPosition?.players || positionHistory[currentIndex]?.players || getInitialPositions(isDoubles, courtDimensions),
    shuttlePosition: tempPosition?.shuttle || positionHistory[currentIndex]?.shuttle || getInitialShuttle(courtDimensions),
    updatePlayerPosition,
    updateShuttlePosition,
    handlePositionChangeComplete,
    toggleGameMode,
    resetPositions,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < positionHistory.length - 1,
    ghostPositions: tempPosition?.ghostPositions || positionHistory[currentIndex]?.ghostPositions,
    showPlayerTrails,
    showShuttleTrail,
    togglePlayerTrails,
    toggleShuttleTrail,
    drillSteps,
    currentStepIndex: currentIndex,
    stepCount: positionHistory.length,
    goToStep,
    importDrill,
  };
}
