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

const hasMoved = (a: PlayerPosition, b: PlayerPosition) => a.x !== b.x || a.y !== b.y;

function statesDiffer(a: PositionState, b: PositionState): boolean {
  return (
    hasMoved(a.shuttle, b.shuttle) ||
    (['team1', 'team2'] as const).some((team) =>
      a.players[team].some((pos, i) => hasMoved(pos, b.players[team][i]))
    )
  );
}

export function useCourtPositions(courtDimensions: CourtDimensions) {
  const [isDoubles, setIsDoubles] = useState(true);
  const [showPlayerTrails, setShowPlayerTrails] = useState(true);
  const [showShuttleTrail, setShowShuttleTrail] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [positionHistory, setPositionHistory] = useState<PositionState[]>([]);
  const [tempPosition, setTempPosition] = useState<PositionState | null>(null);
  // Together: while armed, drag commits are deferred — every move accumulates
  // in tempPosition and saving pushes them as one history step.
  const [isTogether, setIsTogether] = useState(false);
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
    base: PositionState,
    committed: PositionState,
    team?: 'team1' | 'team2',
    index?: number,
    isShuttle: boolean = false,
    isStart: boolean = false
  ) => {
    if (isStart) {
      // Refresh only the dragged piece's ghost, seeding it from the committed
      // state so re-dragging a piece mid-Together keeps its step-start ghost.
      const ghostPositions = {
        team1: [...base.ghostPositions.team1],
        team2: [...base.ghostPositions.team2],
        shuttle: base.ghostPositions.shuttle,
      };

      if (team && typeof index === 'number') {
        ghostPositions[team][index] = committed.players[team][index];
      } else if (isShuttle) {
        ghostPositions.shuttle = committed.shuttle;
      }

      setTempPosition({
        ...newState,
        ghostPositions,
      });
    } else {
      // During drag, maintain existing ghost positions
      setTempPosition(prevTemp => ({
        ...newState,
        ghostPositions: prevTemp?.ghostPositions || base.ghostPositions,
      }));
    }
  }, []);

  const updatePlayerPosition = useCallback((
    team: 'team1' | 'team2',
    index: number,
    newPosition: PlayerPosition,
    isStart: boolean = false
  ) => {
    const committed = positionHistory[currentIndex];
    // Base on the in-progress temp state so moving a second piece (Together)
    // doesn't clobber the first piece's uncommitted move.
    const base = tempPosition ?? committed;
    const newPlayers = {
      ...base.players,
      [team]: base.players[team].map((pos, i) =>
        i === index ? newPosition : pos
      ),
    };

    updatePosition({
      players: newPlayers,
      shuttle: base.shuttle
    }, base, committed, team, index, false, isStart);
  }, [currentIndex, positionHistory, tempPosition, updatePosition]);

  const updateShuttlePosition = useCallback((
    newPosition: PlayerPosition,
    isStart: boolean = false
  ) => {
    const committed = positionHistory[currentIndex];
    const base = tempPosition ?? committed;
    updatePosition({
      players: base.players,
      shuttle: newPosition
    }, base, committed, undefined, undefined, true, isStart);
  }, [currentIndex, positionHistory, tempPosition, updatePosition]);

  const commitTemp = useCallback(() => {
    if (!tempPosition) return;
    // Skip no-op commits: a tap without a drag must not add a history step.
    if (statesDiffer(tempPosition, positionHistory[currentIndex])) {
      setPositionHistory(prev => [...prev.slice(0, currentIndex + 1), tempPosition]);
      setCurrentIndex(prev => prev + 1);
    }
    setTempPosition(null);
  }, [currentIndex, positionHistory, tempPosition]);

  const handlePositionChangeComplete = useCallback(() => {
    if (isTogether) return; // armed: keep accumulating until saved
    commitTemp();
  }, [commitTemp, isTogether]);

  // Arm Together, or — when already armed — save the accumulated moves as
  // one history step.
  const toggleTogether = useCallback(() => {
    if (!isTogether) {
      setIsTogether(true);
      return;
    }
    setIsTogether(false);
    commitTemp();
  }, [commitTemp, isTogether]);

  // Discard the armed step; markers glide back to their committed spots.
  const cancelTogether = useCallback(() => {
    setIsTogether(false);
    setTempPosition(null);
  }, []);

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
    setTempPosition(null);
    setIsTogether(false);
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
    setTempPosition(null);
    setIsTogether(false);
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
    setIsTogether(false);
  }, [isDoubles]);

  const loadNormalizedSteps = useCallback((
    steps: NormalizedStep[],
    nextIsDoubles: boolean = isDoubles
  ) => {
    const courtSteps = denormalizeSteps(steps, courtDimensions);
    loadSteps(courtSteps, nextIsDoubles);
  }, [courtDimensions, isDoubles, loadSteps]);

  // Which pieces have uncommitted moves in the armed Together step (drives
  // the amber rings and the dock badge count).
  const committedState = positionHistory[currentIndex];
  const togetherMoved = isTogether && tempPosition && committedState
    ? {
        team1: tempPosition.players.team1.map((pos, i) => hasMoved(pos, committedState.players.team1[i])),
        team2: tempPosition.players.team2.map((pos, i) => hasMoved(pos, committedState.players.team2[i])),
        shuttle: hasMoved(tempPosition.shuttle, committedState.shuttle),
      }
    : null;

  return {
    isDoubles,
    playerPositions: tempPosition?.players || positionHistory[currentIndex]?.players || getInitialPositions(isDoubles, courtDimensions),
    shuttlePosition: tempPosition?.shuttle || positionHistory[currentIndex]?.shuttle || getInitialShuttle(courtDimensions),
    updatePlayerPosition,
    updateShuttlePosition,
    handlePositionChangeComplete,
    isTogether,
    toggleTogether,
    cancelTogether,
    togetherMoved,
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