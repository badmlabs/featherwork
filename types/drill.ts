import { PlayerPosition, TeamPositions } from './game';

export interface NormalizedPlayerPosition {
  x: number;
  y: number;
}

export interface NormalizedTeamPositions {
  team1: NormalizedPlayerPosition[];
  team2: NormalizedPlayerPosition[];
}

export interface NormalizedGhostPositions {
  team1: NormalizedPlayerPosition[];
  team2: NormalizedPlayerPosition[];
  shuttle: NormalizedPlayerPosition;
}

export interface NormalizedStep {
  players: NormalizedTeamPositions;
  shuttle: NormalizedPlayerPosition;
  ghostPositions: NormalizedGhostPositions;
}

export interface StepSet {
  id: string;
  name: string;
  isDoubles: boolean;
  steps: NormalizedStep[];
  createdAt: number;
}

export interface CourtStep {
  players: TeamPositions;
  shuttle: PlayerPosition;
  ghostPositions: {
    team1: PlayerPosition[];
    team2: PlayerPosition[];
    shuttle: PlayerPosition;
  };
}
