import { useCallback, useState, useEffect } from 'react';
import { TeamPositions, CourtDimensions, PlayerPosition } from '../types/game';
import { CourtStep, NormalizedStep } from '../types/drill';
import { getInitialPositions, getInitialShuttle } from '../utils/courtPositions';
import { denormalizeSteps } from '../utils/stepSharing';

interface GhostPosition {
  team1: PlayerPosition[];
  team2: PlayerPosition[];
  shuttle: PlayerPosition;
}

interface PositionState {
  players: TeamPositions;
  shuttle: PlayerPosition;
  ghostPositions: GhostPosition;
  lastStationaryPositions?: {
    team1: PlayerPosition[];
    team2: PlayerPosition[];
    shuttle: PlayerPosition;
  };
}

export function useCourtPositions(courtDimensions: CourtDimensions) {
  const [isDoubles, setIsDoubles] = useState(true);
  const [showPlayerTrails, setShowPlayerTrails] = useState(true);
  const [showShuttleTrail, setShowShuttleTrail] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [positionHistory, setPositionHistory] = useState<PositionState[]>([]);
  const [tempPosition, setTempPosition] = useState<PositionState | null>(null);
  const [positions, setPositions] = useState<PositionState | null>(null);
  // Initialize state with ghost markers at the same positions as players and shuttle
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
      // Create ghost positions based on current positions, but only update
      // the specific marker that's starting to move
      const ghostPositions = {
        team1: [...currentState.ghostPositions.team1],
        team2: [...currentState.ghostPositions.team2],
        shuttle: currentState.ghostPositions.shuttle,
      };

      if (team && typeof index === 'number') {
        // Only update the ghost position for the specific player being moved
        ghostPositions[team][index] = currentState.players[team][index];
      } else if (isShuttle) {
        // Only update shuttle ghost position if shuttle is being moved
        ghostPositions.shuttle = currentState.shuttle;
      }

      setTempPosition({
        ...newState,
        ghostPositions,
      });

      setPositions({
        ...newState,
        ghostPositions,
      });
    } else {
      // During drag, maintain existing ghost positions
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
      shuttle: currentState.shuttle 
    }, currentState, team, index, false, isStart);
  }, [currentIndex, positionHistory, updatePosition]);

  const updateShuttlePosition = useCallback((
    newPosition: PlayerPosition,
    isStart: boolean = false
  ) => {
    const currentState = positionHistory[currentIndex];
    updatePosition({ 
      players: currentState.players, 
      shuttle: newPosition 
    }, currentState, undefined, undefined, true, isStart);
  }, [currentIndex, positionHistory, updatePosition]);

  const handlePositionChangeComplete = useCallback(() => {
    if (!tempPosition) return;

    // When drag completes, update the position history with the new positions
    // and their corresponding ghost positions
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

  // Reset ghost markers when resetting positions
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

  const toggleShuttleTrail = useCallback(() => {
    setShowShuttleTrail(prev => !prev);
  }, []);

  const getStepsSnapshot = useCallback((): CourtStep[] => {
    return positionHistory.slice(0, currentIndex + 1).map((state) => ({
      players: state.players,
      shuttle: state.shuttle,
      ghostPositions: state.ghostPositions,
    }));
  }, [currentIndex, positionHistory]);

  const loadSteps = useCallback((
    steps: CourtStep[],
    nextIsDoubles: boolean = isDoubles
  ) => {
    if (!steps.length) return;

    if (nextIsDoubles !== isDoubles) {
      setIsDoubles(nextIsDoubles);
    }

    setPositionHistory(steps);
    setCurrentIndex(0);
    setTempPosition(null);
    setPositions(null);
  }, [isDoubles]);

  const loadNormalizedSteps = useCallback((
    steps: NormalizedStep[],
    nextIsDoubles: boolean = isDoubles
  ) => {
    const courtSteps = denormalizeSteps(steps, courtDimensions);
    loadSteps(courtSteps, nextIsDoubles);
  }, [courtDimensions, isDoubles, loadSteps]);

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
    lastStationaryPlayers: positionHistory[currentIndex]?.lastStationaryPositions?.team1 && {
      team1: positionHistory[currentIndex].lastStationaryPositions.team1,
      team2: positionHistory[currentIndex].lastStationaryPositions.team2,
    },
    lastStationaryShuttle: positionHistory[currentIndex]?.lastStationaryPositions?.shuttle,
    ghostPositions: tempPosition?.ghostPositions || positionHistory[currentIndex]?.ghostPositions,
    showPlayerTrails,
    showShuttleTrail,
    togglePlayerTrails,
    toggleShuttleTrail,
    getStepsSnapshot,
    loadSteps,
    loadNormalizedSteps,
    stepCount: currentIndex + 1,
    totalSteps: positionHistory.length,
  };
} 