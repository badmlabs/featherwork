import { NormalizedPlayerPosition, NormalizedStep } from '../types/drill';
import { CourtDimensions } from '../types/game';

/**
 * Drill Vault: curated badminton drills and tactical patterns, authored in
 * the same normalized coordinate space the court simulator uses everywhere
 * (0..1 over the court container, net at y=0.5, team1 = top half,
 * team2 = bottom half / the "you" side).
 *
 * Landmarks (approx): back boundaries y=0.07/0.93, doubles long service
 * y=0.12/0.88, short service lines y=0.37/0.63, sidelines x=0.08/0.92.
 */

export type VaultCategory =
  | 'Footwork'
  | 'Attack'
  | 'Defense'
  | 'Serve & Return'
  | 'Rotation'
  | 'Deception';

export type VaultDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface VaultDrill {
  id: string;
  name: string;
  category: VaultCategory;
  difficulty: VaultDifficulty;
  isDoubles: boolean;
  premium: boolean;
  description: string;
  tip: string;
  steps: NormalizedStep[];
}

type XY = readonly [number, number];

interface Frame {
  /** Top team positions (opponents). */
  t1: XY[];
  /** Bottom team positions (the side running the drill). */
  t2: XY[];
  /** Shuttle position. */
  s: XY;
}

const point = ([x, y]: XY): NormalizedPlayerPosition => ({ x, y });

/** Ghosts mirror the previous frame, same convention as shared-link imports. */
function buildSteps(frames: Frame[]): NormalizedStep[] {
  return frames.map((frame, index) => {
    const prev = index > 0 ? frames[index - 1] : frame;
    return {
      players: {
        team1: frame.t1.map(point),
        team2: frame.t2.map(point),
      },
      shuttle: point(frame.s),
      ghostPositions: {
        team1: prev.t1.map(point),
        team2: prev.t2.map(point),
        shuttle: point(prev.s),
      },
    };
  });
}

export const VAULT_DRILLS: VaultDrill[] = [
  // ---------------------------------------------------------------- FREE
  {
    id: 'four-corner-shadow',
    name: 'Four-Corner Shadow',
    category: 'Footwork',
    difficulty: 'Beginner',
    isDoubles: false,
    premium: false,
    description:
      'The foundation of singles movement: push off from base to each corner and recover before the next feed.',
    tip: 'Always split-step as the feeder strikes — arriving early matters less than leaving on time.',
    steps: buildSteps([
      { t1: [[0.5, 0.24]], t2: [[0.5, 0.75]], s: [0.5, 0.5] },
      { t1: [[0.5, 0.24]], t2: [[0.66, 0.57]], s: [0.7, 0.55] },
      { t1: [[0.5, 0.24]], t2: [[0.5, 0.75]], s: [0.5, 0.3] },
      { t1: [[0.5, 0.24]], t2: [[0.34, 0.57]], s: [0.3, 0.55] },
      { t1: [[0.5, 0.24]], t2: [[0.5, 0.75]], s: [0.5, 0.3] },
      { t1: [[0.5, 0.24]], t2: [[0.33, 0.87]], s: [0.28, 0.86] },
      { t1: [[0.5, 0.24]], t2: [[0.5, 0.75]], s: [0.5, 0.3] },
      { t1: [[0.5, 0.24]], t2: [[0.67, 0.87]], s: [0.72, 0.86] },
      { t1: [[0.5, 0.24]], t2: [[0.5, 0.75]], s: [0.5, 0.3] },
    ]),
  },
  {
    id: 'attack-defense-rotation',
    name: 'Attack to Defense Rotation',
    category: 'Rotation',
    difficulty: 'Intermediate',
    isDoubles: true,
    premium: false,
    description:
      'The moment your pair lifts, front-and-back must become side-by-side. Drill the switch until it is automatic.',
    tip: 'The rear attacker chooses the side they smashed from; the net player fills the other half.',
    steps: buildSteps([
      { t1: [[0.32, 0.24], [0.68, 0.24]], t2: [[0.5, 0.6], [0.55, 0.83]], s: [0.55, 0.81] },
      { t1: [[0.32, 0.24], [0.66, 0.26]], t2: [[0.5, 0.6], [0.55, 0.83]], s: [0.66, 0.26] },
      { t1: [[0.32, 0.24], [0.64, 0.28]], t2: [[0.4, 0.58], [0.55, 0.8]], s: [0.4, 0.56] },
      { t1: [[0.5, 0.4], [0.64, 0.15]], t2: [[0.32, 0.74], [0.68, 0.76]], s: [0.66, 0.12] },
      { t1: [[0.5, 0.42], [0.62, 0.18]], t2: [[0.34, 0.75], [0.68, 0.76]], s: [0.34, 0.73] },
      { t1: [[0.44, 0.42], [0.62, 0.2]], t2: [[0.34, 0.73], [0.68, 0.74]], s: [0.44, 0.44] },
    ]),
  },
  {
    id: 'low-serve-third-shot',
    name: 'Low Serve, Third-Shot Kill',
    category: 'Serve & Return',
    difficulty: 'Beginner',
    isDoubles: true,
    premium: false,
    description:
      'Serve tight to the T, then follow your serve in: any loose return above tape height is your point.',
    tip: 'Keep the racket up after serving — the third shot is played in front of you, never behind.',
    steps: buildSteps([
      { t1: [[0.46, 0.38], [0.55, 0.2]], t2: [[0.46, 0.64], [0.52, 0.8]], s: [0.46, 0.62] },
      { t1: [[0.47, 0.42], [0.55, 0.2]], t2: [[0.46, 0.64], [0.52, 0.8]], s: [0.47, 0.46] },
      { t1: [[0.47, 0.44], [0.55, 0.22]], t2: [[0.53, 0.585], [0.52, 0.8]], s: [0.55, 0.55] },
      { t1: [[0.45, 0.28], [0.62, 0.22]], t2: [[0.54, 0.57], [0.52, 0.78]], s: [0.52, 0.35] },
    ]),
  },

  // ------------------------------------------------------------- PREMIUM
  {
    id: 'clear-drop-net-squeeze',
    name: 'Clear–Drop–Net Squeeze',
    category: 'Attack',
    difficulty: 'Intermediate',
    isDoubles: false,
    premium: true,
    description:
      'Classic singles pressure pattern: pin them deep with clears, pull them in with a crosscourt drop, then win the net exchange.',
    tip: 'The drop only works if your clear was honest — hit it deep enough to move their base backwards first.',
    steps: buildSteps([
      { t1: [[0.5, 0.25]], t2: [[0.62, 0.85]], s: [0.63, 0.83] },
      { t1: [[0.34, 0.13]], t2: [[0.5, 0.74]], s: [0.32, 0.1] },
      { t1: [[0.5, 0.26]], t2: [[0.36, 0.87]], s: [0.34, 0.88] },
      { t1: [[0.6, 0.42]], t2: [[0.5, 0.7]], s: [0.62, 0.44] },
      { t1: [[0.58, 0.4]], t2: [[0.54, 0.58]], s: [0.55, 0.55] },
      { t1: [[0.52, 0.3]], t2: [[0.58, 0.7]], s: [0.58, 0.68] },
      { t1: [[0.4, 0.32]], t2: [[0.57, 0.68]], s: [0.48, 0.28] },
    ]),
  },
  {
    id: 'backhand-corner-assault',
    name: 'Backhand Corner Assault',
    category: 'Attack',
    difficulty: 'Advanced',
    isDoubles: false,
    premium: true,
    description:
      'Hammer the same rear corner twice in a row. The first reply is defensive; the second is a sitter you finish crosscourt.',
    tip: 'Repetition is the tactic: the second lift to the same corner lands before their footwork has reset.',
    steps: buildSteps([
      { t1: [[0.5, 0.25]], t2: [[0.52, 0.72]], s: [0.52, 0.7] },
      { t1: [[0.68, 0.13]], t2: [[0.5, 0.75]], s: [0.7, 0.1] },
      { t1: [[0.66, 0.16]], t2: [[0.62, 0.58]], s: [0.64, 0.57] },
      { t1: [[0.7, 0.14]], t2: [[0.5, 0.75]], s: [0.72, 0.11] },
      { t1: [[0.64, 0.2]], t2: [[0.55, 0.68]], s: [0.55, 0.65] },
      { t1: [[0.6, 0.25]], t2: [[0.56, 0.7]], s: [0.3, 0.3] },
    ]),
  },
  {
    id: 'hold-and-flick',
    name: 'Hold & Flick',
    category: 'Deception',
    difficulty: 'Advanced',
    isDoubles: false,
    premium: true,
    description:
      'Show the net shot, hold the racket face, and flick behind them the instant they commit forward.',
    tip: 'The hold is the shot — freeze the racket head until you see their weight shift onto the front foot.',
    steps: buildSteps([
      { t1: [[0.5, 0.26]], t2: [[0.64, 0.575]], s: [0.65, 0.54] },
      { t1: [[0.54, 0.38]], t2: [[0.64, 0.575]], s: [0.65, 0.54] },
      { t1: [[0.38, 0.16]], t2: [[0.5, 0.72]], s: [0.34, 0.1] },
      { t1: [[0.4, 0.18]], t2: [[0.48, 0.68]], s: [0.48, 0.66] },
      { t1: [[0.44, 0.24]], t2: [[0.49, 0.68]], s: [0.45, 0.26] },
    ]),
  },
  {
    id: 'channel-attack',
    name: 'Channel Attack',
    category: 'Attack',
    difficulty: 'Advanced',
    isDoubles: true,
    premium: true,
    description:
      'Attack down one tramline to isolate a single defender. Straight smash, straight intercept, kill the short lift.',
    tip: 'Resist the crosscourt until the kill — every straight shot keeps the second defender out of the rally.',
    steps: buildSteps([
      { t1: [[0.34, 0.24], [0.68, 0.24]], t2: [[0.52, 0.6], [0.6, 0.83]], s: [0.6, 0.81] },
      { t1: [[0.34, 0.24], [0.68, 0.26]], t2: [[0.52, 0.6], [0.6, 0.83]], s: [0.68, 0.25] },
      { t1: [[0.34, 0.24], [0.66, 0.28]], t2: [[0.6, 0.57], [0.6, 0.8]], s: [0.62, 0.55] },
      { t1: [[0.36, 0.26], [0.67, 0.27]], t2: [[0.61, 0.56], [0.62, 0.8]], s: [0.67, 0.28] },
      { t1: [[0.36, 0.26], [0.64, 0.3]], t2: [[0.58, 0.6], [0.64, 0.74]], s: [0.64, 0.7] },
      { t1: [[0.4, 0.28], [0.62, 0.32]], t2: [[0.58, 0.6], [0.64, 0.72]], s: [0.55, 0.3] },
    ]),
  },
  {
    id: 'defense-counterattack',
    name: 'Defense to Counterattack',
    category: 'Defense',
    difficulty: 'Intermediate',
    isDoubles: true,
    premium: true,
    description:
      'Soak up the smash, block tight to force their lift, then flip the formation and take the attack back.',
    tip: 'A good block is a shot, not a save — aim it at the half-court gap in front of the net player.',
    steps: buildSteps([
      { t1: [[0.48, 0.4], [0.55, 0.15]], t2: [[0.32, 0.76], [0.68, 0.76]], s: [0.55, 0.17] },
      { t1: [[0.48, 0.4], [0.55, 0.18]], t2: [[0.34, 0.75], [0.68, 0.76]], s: [0.34, 0.73] },
      { t1: [[0.6, 0.42], [0.55, 0.2]], t2: [[0.34, 0.75], [0.68, 0.76]], s: [0.64, 0.44] },
      { t1: [[0.34, 0.24], [0.66, 0.24]], t2: [[0.5, 0.62], [0.66, 0.84]], s: [0.68, 0.82] },
      { t1: [[0.36, 0.26], [0.66, 0.26]], t2: [[0.5, 0.62], [0.66, 0.82]], s: [0.36, 0.28] },
    ]),
  },
  {
    id: 'midcourt-drive-battle',
    name: 'Mid-Court Drive Battle',
    category: 'Attack',
    difficulty: 'Intermediate',
    isDoubles: true,
    premium: true,
    description:
      'Flat, fast exchanges through the middle. Whoever wins the front of the tape wins the rally.',
    tip: 'Creep forward with every drive you hit — the pair that gains ground gets the downward angle first.',
    steps: buildSteps([
      { t1: [[0.42, 0.3], [0.62, 0.28]], t2: [[0.4, 0.68], [0.62, 0.72]], s: [0.62, 0.7] },
      { t1: [[0.42, 0.32], [0.62, 0.28]], t2: [[0.4, 0.66], [0.6, 0.7]], s: [0.42, 0.31] },
      { t1: [[0.42, 0.3], [0.6, 0.26]], t2: [[0.41, 0.66], [0.6, 0.7]], s: [0.41, 0.65] },
      { t1: [[0.4, 0.3], [0.6, 0.26]], t2: [[0.4, 0.64], [0.6, 0.68]], s: [0.4, 0.31] },
      { t1: [[0.42, 0.32], [0.6, 0.28]], t2: [[0.48, 0.585], [0.6, 0.68]], s: [0.5, 0.55] },
      { t1: [[0.44, 0.34], [0.58, 0.3]], t2: [[0.49, 0.58], [0.6, 0.66]], s: [0.5, 0.36] },
    ]),
  },
  {
    id: 'flick-serve-pressure',
    name: 'Flick Serve Under Pressure',
    category: 'Serve & Return',
    difficulty: 'Intermediate',
    isDoubles: true,
    premium: true,
    description:
      'Beaten by the flick? Turn, take it overhead, and smash straight while your partner claims the net.',
    tip: 'Never backpedal facing the net — turn side-on immediately and the flick becomes an attacking chance.',
    steps: buildSteps([
      { t1: [[0.54, 0.38], [0.5, 0.18]], t2: [[0.46, 0.66], [0.56, 0.8]], s: [0.54, 0.4] },
      { t1: [[0.54, 0.36], [0.5, 0.18]], t2: [[0.4, 0.83], [0.48, 0.64]], s: [0.38, 0.85] },
      { t1: [[0.36, 0.26], [0.66, 0.26]], t2: [[0.42, 0.82], [0.5, 0.6]], s: [0.42, 0.28] },
      { t1: [[0.38, 0.28], [0.64, 0.28]], t2: [[0.42, 0.8], [0.47, 0.575]], s: [0.46, 0.55] },
      { t1: [[0.4, 0.3], [0.62, 0.3]], t2: [[0.44, 0.78], [0.48, 0.58]], s: [0.5, 0.34] },
    ]),
  },
  {
    id: 'smash-defense-counter',
    name: 'Smash Defense & Counter',
    category: 'Defense',
    difficulty: 'Intermediate',
    isDoubles: false,
    premium: true,
    description:
      'Absorb the straight smash, block to the far net corner, and make them pay for a second-rate second attack.',
    tip: 'Defend with the racket in front of your body and the block becomes a counterattack, not a lift.',
    steps: buildSteps([
      { t1: [[0.36, 0.12]], t2: [[0.5, 0.78]], s: [0.36, 0.14] },
      { t1: [[0.38, 0.16]], t2: [[0.38, 0.76]], s: [0.36, 0.74] },
      { t1: [[0.42, 0.42]], t2: [[0.42, 0.72]], s: [0.4, 0.44] },
      { t1: [[0.44, 0.4]], t2: [[0.47, 0.585]], s: [0.46, 0.54] },
      { t1: [[0.66, 0.14]], t2: [[0.5, 0.77]], s: [0.68, 0.1] },
      { t1: [[0.64, 0.18]], t2: [[0.63, 0.76]], s: [0.64, 0.74] },
      { t1: [[0.58, 0.24]], t2: [[0.62, 0.74]], s: [0.42, 0.3] },
    ]),
  },
  {
    id: 'rush-the-t',
    name: 'Rush the T',
    category: 'Serve & Return',
    difficulty: 'Advanced',
    isDoubles: true,
    premium: true,
    description:
      'Attack the low serve at tape height: push to the server\'s hip, hold the net, and let your partner finish.',
    tip: 'Your first step decides the rally — move on the server\'s racket drop, not on contact.',
    steps: buildSteps([
      { t1: [[0.46, 0.36], [0.52, 0.18]], t2: [[0.46, 0.655], [0.55, 0.8]], s: [0.46, 0.38] },
      { t1: [[0.46, 0.36], [0.52, 0.18]], t2: [[0.47, 0.55], [0.55, 0.78]], s: [0.47, 0.52] },
      { t1: [[0.58, 0.33], [0.52, 0.2]], t2: [[0.5, 0.58], [0.55, 0.76]], s: [0.6, 0.3] },
      { t1: [[0.56, 0.34], [0.5, 0.22]], t2: [[0.5, 0.58], [0.53, 0.7]], s: [0.52, 0.66] },
      { t1: [[0.54, 0.36], [0.48, 0.24]], t2: [[0.51, 0.58], [0.53, 0.68]], s: [0.5, 0.28] },
    ]),
  },
];

// Drill coordinates above are authored in a fixed reference frame where the
// painted court spans x 0.07–0.93, y 0.06–0.94 and the net sits at y 0.50.
// The app normalizes positions over the full screen, so at load time we map
// the reference frame onto the measured lines rect of the actual device.
const REF = { x0: 0.07, x1: 0.93, y0: 0.06, y1: 0.94 };

export function drillStepsForCourt(
  steps: NormalizedStep[],
  dimensions: CourtDimensions
): NormalizedStep[] {
  const { width, height, linesRect } = dimensions;
  if (!linesRect || width <= 0 || height <= 0) {
    return steps;
  }

  const mapPos = (pos: NormalizedPlayerPosition): NormalizedPlayerPosition => ({
    x: (linesRect.x + ((pos.x - REF.x0) / (REF.x1 - REF.x0)) * linesRect.width) / width,
    y: (linesRect.y + ((pos.y - REF.y0) / (REF.y1 - REF.y0)) * linesRect.height) / height,
  });

  return steps.map((step) => ({
    players: {
      team1: step.players.team1.map(mapPos),
      team2: step.players.team2.map(mapPos),
    },
    shuttle: mapPos(step.shuttle),
    ghostPositions: {
      team1: step.ghostPositions.team1.map(mapPos),
      team2: step.ghostPositions.team2.map(mapPos),
      shuttle: mapPos(step.ghostPositions.shuttle),
    },
  }));
}

export const VAULT_CATEGORIES: VaultCategory[] = [
  ...new Set(VAULT_DRILLS.map((drill) => drill.category)),
];

export const PREMIUM_DRILL_COUNT = VAULT_DRILLS.filter((drill) => drill.premium).length;
