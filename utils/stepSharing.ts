import { CourtDimensions } from '../types/game';
import { CourtStep, NormalizedStep, StepSet } from '../types/drill';

const LEGACY_SCHEME = 'badminton-court-simulator';
const LEGACY_IMPORT_PATH = 'import';
export const SHARE_BASE_URL = 'https://badmlabs.github.io/court/import.html';

const SHARE_LINK_PATTERN =
  /(?:badminton-court-simulator:\/\/import|https:\/\/badmlabs\.github\.io\/court\/import(?:\.html|\/)?)\?d=([A-Za-z0-9\-_]+)/;

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normalizePosition(
  position: { x: number; y: number },
  dimensions: CourtDimensions
): { x: number; y: number } {
  return {
    x: dimensions.width > 0 ? position.x / dimensions.width : 0,
    y: dimensions.height > 0 ? position.y / dimensions.height : 0,
  };
}

function denormalizePosition(
  position: { x: number; y: number },
  dimensions: CourtDimensions
): { x: number; y: number } {
  return {
    x: position.x * dimensions.width,
    y: position.y * dimensions.height,
  };
}

export function normalizeSteps(
  steps: CourtStep[],
  dimensions: CourtDimensions
): NormalizedStep[] {
  return steps.map((step) => ({
    players: {
      team1: step.players.team1.map((pos) => normalizePosition(pos, dimensions)),
      team2: step.players.team2.map((pos) => normalizePosition(pos, dimensions)),
    },
    shuttle: normalizePosition(step.shuttle, dimensions),
    ghostPositions: {
      team1: step.ghostPositions.team1.map((pos) => normalizePosition(pos, dimensions)),
      team2: step.ghostPositions.team2.map((pos) => normalizePosition(pos, dimensions)),
      shuttle: normalizePosition(step.ghostPositions.shuttle, dimensions),
    },
  }));
}

export function denormalizeSteps(
  steps: NormalizedStep[],
  dimensions: CourtDimensions
): CourtStep[] {
  return steps.map((step) => ({
    players: {
      team1: step.players.team1.map((pos) => denormalizePosition(pos, dimensions)),
      team2: step.players.team2.map((pos) => denormalizePosition(pos, dimensions)),
    },
    shuttle: denormalizePosition(step.shuttle, dimensions),
    ghostPositions: {
      team1: step.ghostPositions.team1.map((pos) => denormalizePosition(pos, dimensions)),
      team2: step.ghostPositions.team2.map((pos) => denormalizePosition(pos, dimensions)),
      shuttle: denormalizePosition(step.ghostPositions.shuttle, dimensions),
    },
  }));
}

function encodeBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;

  while (i < value.length) {
    const chr1 = value.charCodeAt(i++);
    const chr2 = value.charCodeAt(i++);
    const chr3 = value.charCodeAt(i++);

    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    const enc3 = isNaN(chr2) ? 64 : (((chr2 & 15) << 2) | (chr3 >> 6));
    const enc4 = isNaN(chr3) ? 64 : (chr3 & 63);

    output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }

  return output;
}

function decodeBase64(value: string): string {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;

  const input = value.replace(/[^A-Za-z0-9+/=]/g, '');

  while (i < input.length) {
    const enc1 = chars.indexOf(input.charAt(i++));
    const enc2 = chars.indexOf(input.charAt(i++));
    const enc3 = chars.indexOf(input.charAt(i++));
    const enc4 = chars.indexOf(input.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  return output;
}

export function createStepSet(
  name: string,
  isDoubles: boolean,
  steps: CourtStep[],
  dimensions: CourtDimensions
): StepSet {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    isDoubles,
    steps: normalizeSteps(steps, dimensions),
    createdAt: Date.now(),
  };
}

function flattenStep(step: NormalizedStep, isDoubles: boolean): number[] {
  const values: number[] = [];
  const team1 = isDoubles ? step.players.team1 : step.players.team1.slice(0, 1);
  const team2 = isDoubles ? step.players.team2 : step.players.team2.slice(0, 1);

  for (const position of team1) {
    values.push(roundCoord(position.x), roundCoord(position.y));
  }
  for (const position of team2) {
    values.push(roundCoord(position.x), roundCoord(position.y));
  }
  values.push(roundCoord(step.shuttle.x), roundCoord(step.shuttle.y));
  return values;
}

function expandCompactSteps(values: number[][], isDoubles: boolean): NormalizedStep[] {
  return values.map((flat, index) => {
    const team1Count = isDoubles ? 2 : 1;
    const team2Count = isDoubles ? 2 : 1;
    let cursor = 0;

    const readPosition = () => ({
      x: flat[cursor++],
      y: flat[cursor++],
    });

    const players = {
      team1: Array.from({ length: team1Count }, readPosition),
      team2: Array.from({ length: team2Count }, readPosition),
    };
    const shuttle = readPosition();

    const previousStep = index > 0 ? expandCompactSteps([values[index - 1]], isDoubles)[0] : null;
    const ghostPositions = previousStep
      ? {
          team1: previousStep.players.team1,
          team2: previousStep.players.team2,
          shuttle: previousStep.shuttle,
        }
      : {
          team1: players.team1,
          team2: players.team2,
          shuttle,
        };

    return {
      players,
      shuttle,
      ghostPositions,
    };
  });
}

function encodePayload(stepSet: StepSet): string {
  const payload = JSON.stringify({
    v: 2,
    n: stepSet.name,
    b: stepSet.isDoubles ? 1 : 0,
    s: stepSet.steps.map((step) => flattenStep(step, stepSet.isDoubles)),
  });

  return encodeBase64(payload)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseV1Payload(payload: {
  name?: string;
  isDoubles?: boolean;
  steps?: NormalizedStep[];
}): StepSet | null {
  if (!payload?.steps?.length) {
    return null;
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: payload.name || 'Imported Step Set',
    isDoubles: payload.isDoubles ?? true,
    steps: payload.steps,
    createdAt: Date.now(),
  };
}

function parseV2Payload(payload: {
  n?: string;
  b?: number;
  s?: number[][];
}): StepSet | null {
  if (!payload?.s?.length) {
    return null;
  }

  const isDoubles = payload.b !== 0;
  const steps = expandCompactSteps(payload.s, isDoubles);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: payload.n || 'Imported Step Set',
    isDoubles,
    steps,
    createdAt: Date.now(),
  };
}

function parseEncodedPayload(encoded: string): StepSet | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = decodeBase64(padded);
    const payload = JSON.parse(decoded) as {
      v?: number;
      name?: string;
      isDoubles?: boolean;
      steps?: NormalizedStep[];
      n?: string;
      b?: number;
      s?: number[][];
    };

    if (payload.v === 2) {
      return parseV2Payload(payload);
    }

    return parseV1Payload(payload);
  } catch {
    return null;
  }
}

export function encodeStepSetForSharing(stepSet: StepSet): string {
  return `${SHARE_BASE_URL}?d=${encodePayload(stepSet)}`;
}

export function encodeLegacyStepSetLink(stepSet: StepSet): string {
  return `${LEGACY_SCHEME}://${LEGACY_IMPORT_PATH}?d=${encodePayload(stepSet)}`;
}

export function decodeSharedStepSet(sharedText: string): StepSet | null {
  const trimmed = sharedText.trim();
  const match = trimmed.match(SHARE_LINK_PATTERN);

  if (!match) {
    return null;
  }

  return parseEncodedPayload(match[1]);
}

export function getShareMessage(stepSet: StepSet): string {
  const link = encodeStepSetForSharing(stepSet);
  return `Badminton drill: ${stepSet.name}\n\n${link}\n\nTap the link to open in Badminton Court Simulator, or copy and use Import from clipboard.`;
}
