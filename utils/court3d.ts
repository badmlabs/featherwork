import {
  CENTER_X,
  COURT_H,
  COURT_W,
  LinesRect,
  LONG_SERVICE_Y,
  NET_OVERHANG_UNITS,
  NET_Y,
  SHORT_SERVICE_Y,
  SINGLES_X,
} from '../components/CourtSvg';

/**
 * Perspective projection for the tilt-to-3D court view.
 *
 * Court space: 1 unit = 1 cm, x 0..610 (left→right), z 0..1340 (top→bottom
 * of the 2D court), h up. At b=0 (flat) a ground point projects to exactly
 * the same screen point CourtSvg paints it at, so the 2D↔3D tilt morphs
 * seamlessly from the existing court.
 */

export interface CamState {
  /** Tilt blend: 0 = flat 2D court, 1 = fully tilted 3D. */
  b: number;
  thetaDeg: number;
  phiDeg: number;
  zoom: number;
}

export const THETA_DEFAULT = 48;
export const THETA_MIN = 24;
export const THETA_MAX = 60;
export const PHI_MAX = 18;
export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 1.4;

export const NET_POST_H = 155; // BWF net height at the posts, cm

// Tuned in the design prototype: camera distance and height exaggeration are
// in court cm; the scale boost/center lift keep the tilted court filling the
// space the foreshortening frees up.
const CAM_DIST = 1900;
const HEIGHT_LIFT = 0.55;
const TILT_SCALE_BOOST = 1.214;
const TILT_CENTER_LIFT = 0.075;

export type Projected = readonly [x: number, y: number, scale: number];
export type Projector = (x: number, z: number, h?: number) => Projected;

export function makeProjector(lines: LinesRect, cam: CamState): Projector {
  const th = (cam.thetaDeg * Math.PI) / 180 * cam.b;
  const ph = (cam.phiDeg * Math.PI) / 180 * cam.b;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  const cp = Math.cos(ph);
  const sp = Math.sin(ph);
  const sx2d = lines.width / COURT_W;
  const sy2d = lines.height / COURT_H;
  const s3d = TILT_SCALE_BOOST * sx2d;
  const scaleX = (sx2d + (s3d - sx2d) * cam.b) * cam.zoom;
  const scaleY = (sy2d + (s3d - sy2d) * cam.b) * cam.zoom;
  const cx = lines.x + lines.width / 2;
  const cy = lines.y + lines.height / 2 - TILT_CENTER_LIFT * lines.height * cam.b;

  return (x, z, h = 0) => {
    const xc = x - COURT_W / 2;
    const zc = z - COURT_H / 2;
    const xr = xc * cp - zc * sp; // yaw around the court center
    const zr = xc * sp + zc * cp;
    const hh = h * HEIGHT_LIFT;
    const yr = zr * ct - hh * st; // tilt toward the camera
    const depth = zr * st + hh * ct;
    const s = CAM_DIST / (CAM_DIST - depth);
    return [cx + xr * s * scaleX, cy + yr * s * scaleY, s];
  };
}

export interface CourtPoint {
  x: number;
  z: number;
}

export interface Shot {
  p0: CourtPoint;
  p1: CourtPoint;
  h0: number; // launch height (racket contact)
  peak: number; // extra parabolic lift at mid-flight
  dur: number; // flight time, ms
}

const HIT_HEIGHT = 170;
export const MIN_SHOT_DIST = 12; // below this the shuttle "didn't move"
export const REST_STEP_MS = 900; // dwell on a step whose shuttle stayed put

// ponytail: arc height & flight time inferred from shot length (long = high
// clear, short = flat kill), fit to the design prototype's rally; use a real
// per-shot type if steps ever carry one.
export function shotBetween(from: CourtPoint, to: CourtPoint): Shot | null {
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  if (dist < MIN_SHOT_DIST) return null;
  return {
    p0: from,
    p1: to,
    h0: HIT_HEIGHT,
    peak: Math.min(350, Math.max(0, 0.67 * dist - 348)),
    dur: Math.min(2000, Math.max(700, 600 + dist * 1.28)),
  };
}

/** Shuttle position along a shot at t ∈ [0,1] → [x, z, h]. */
export function shotPos(shot: Shot, t: number): [number, number, number] {
  const { p0, p1 } = shot;
  return [
    p0.x + (p1.x - p0.x) * t,
    p0.z + (p1.z - p0.z) * t,
    shot.h0 * (1 - t) + 4 * shot.peak * t * (1 - t),
  ];
}

export function arcPath(
  project: Projector,
  shot: Shot,
  t0: number,
  t1: number,
  segments = 20
): string {
  let d = '';
  for (let i = 0; i <= segments; i++) {
    const [x, z, h] = shotPos(shot, t0 + ((t1 - t0) * i) / segments);
    const p = project(x, z, h);
    d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ';
  }
  return d;
}

/** Marker-center screen point → court units. */
export function courtPointFromScreen(cx: number, cy: number, lines: LinesRect): CourtPoint {
  return {
    x: ((cx - lines.x) / lines.width) * COURT_W,
    z: ((cy - lines.y) / lines.height) * COURT_H,
  };
}

// Painted line segments [x1, z1, x2, z2] — same geometry CourtSvg draws flat.
const S0 = SHORT_SERVICE_Y[0];
const S1 = SHORT_SERVICE_Y[1];
export const COURT_LINE_SEGMENTS: readonly (readonly [number, number, number, number])[] = [
  [0, 0, COURT_W, 0],
  [0, COURT_H, COURT_W, COURT_H],
  [0, 0, 0, COURT_H],
  [COURT_W, 0, COURT_W, COURT_H],
  [SINGLES_X[0], 0, SINGLES_X[0], COURT_H],
  [SINGLES_X[1], 0, SINGLES_X[1], COURT_H],
  [0, LONG_SERVICE_Y[0], COURT_W, LONG_SERVICE_Y[0]],
  [0, LONG_SERVICE_Y[1], COURT_W, LONG_SERVICE_Y[1]],
  [0, S0, COURT_W, S0],
  [0, S1, COURT_W, S1],
  [CENTER_X, 0, CENTER_X, S0],
  [CENTER_X, S1, CENTER_X, COURT_H],
];

export function courtLinesPath(project: Projector): string {
  return COURT_LINE_SEGMENTS.map((l) => {
    const a = project(l[0], l[1]);
    const b = project(l[2], l[3]);
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }).join(' ');
}

export const NET_X0 = -NET_OVERHANG_UNITS;
export const NET_X1 = COURT_W + NET_OVERHANG_UNITS;
export { COURT_W, COURT_H, NET_Y };
