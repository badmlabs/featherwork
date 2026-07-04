import {
  arcPath,
  courtPointFromScreen,
  makeProjector,
  MIN_SHOT_DIST,
  shotBetween,
  shotPos,
  THETA_DEFAULT,
} from '../court3d';
import { COURT_H, COURT_W } from '../../components/CourtSvg';

const lines = { x: 30, y: 120, width: 342, height: 610 };
const flat = { b: 0, thetaDeg: THETA_DEFAULT, phiDeg: 0, zoom: 1 };
const tilted = { b: 1, thetaDeg: THETA_DEFAULT, phiDeg: 0, zoom: 1 };

describe('makeProjector', () => {
  it('at b=0 matches the 2D CourtSvg mapping exactly for ground points', () => {
    const project = makeProjector(lines, flat);
    const sx = lines.width / COURT_W;
    const sy = lines.height / COURT_H;
    for (const [x, z] of [
      [0, 0],
      [COURT_W, 0],
      [0, COURT_H],
      [COURT_W, COURT_H],
      [305, 670],
      [46, 472],
    ]) {
      const [px, py, s] = project(x, z, 0);
      expect(px).toBeCloseTo(lines.x + x * sx, 6);
      expect(py).toBeCloseTo(lines.y + z * sy, 6);
      expect(s).toBeCloseTo(1, 6);
    }
  });

  it('at b=1 the near edge is larger and lower on screen than the far edge', () => {
    const project = makeProjector(lines, tilted);
    const far = project(305, 0, 0);
    const near = project(305, COURT_H, 0);
    expect(near[2]).toBeGreaterThan(1);
    expect(far[2]).toBeLessThan(1);
    expect(near[1]).toBeGreaterThan(far[1]);
    // Perspective: the near half of the court spans more pixels than the far half
    const mid = project(305, 670, 0);
    expect(near[1] - mid[1]).toBeGreaterThan(mid[1] - far[1]);
  });

  it('keeps the court x-centered when phi=0 and elevates high points', () => {
    const project = makeProjector(lines, tilted);
    const centerGround = project(305, 670, 0);
    const centerHigh = project(305, 670, 300);
    expect(centerGround[0]).toBeCloseTo(lines.x + lines.width / 2, 6);
    expect(centerHigh[1]).toBeLessThan(centerGround[1]); // up on screen
  });

  it('yaw shifts a centered far point sideways', () => {
    const project = makeProjector(lines, { ...tilted, phiDeg: 15 });
    const far = project(305, 0, 0);
    expect(Math.abs(far[0] - (lines.x + lines.width / 2))).toBeGreaterThan(5);
  });

  it('zoom scales around the court center', () => {
    const zoomed = makeProjector(lines, { ...flat, zoom: 1.4 });
    const [px] = zoomed(0, 670, 0);
    const cx = lines.x + lines.width / 2;
    expect(px).toBeCloseTo(cx - (lines.width / 2) * 1.4, 6);
  });
});

describe('shots', () => {
  it('ignores moves below the minimum distance', () => {
    expect(shotBetween({ x: 100, z: 100 }, { x: 100 + MIN_SHOT_DIST - 1, z: 100 })).toBeNull();
  });

  it('gives a clear-length shot a high slow arc and a kill-length shot a flat one', () => {
    const clear = shotBetween({ x: 150, z: 1200 }, { x: 460, z: 240 })!; // ~1009cm
    const kill = shotBetween({ x: 220, z: 780 }, { x: 400, z: 430 })!; // ~394cm
    expect(clear.peak).toBeGreaterThan(280);
    expect(clear.peak).toBeLessThanOrEqual(350);
    expect(kill.peak).toBe(0);
    expect(clear.dur).toBeGreaterThan(kill.dur);
    expect(clear.dur).toBeLessThanOrEqual(2000);
    expect(kill.dur).toBeGreaterThanOrEqual(700);
  });

  it('flies from launch height to the floor with lift in between', () => {
    const shot = shotBetween({ x: 100, z: 1100 }, { x: 500, z: 300 })!;
    const [x0, z0, h0] = shotPos(shot, 0);
    const [x1, z1, h1] = shotPos(shot, 1);
    const [, , hMid] = shotPos(shot, 0.5);
    expect([x0, z0]).toEqual([100, 1100]);
    expect([x1, z1]).toEqual([500, 300]);
    expect(h0).toBeGreaterThan(0);
    expect(h1).toBe(0);
    expect(hMid).toBeGreaterThan((h0 + h1) / 2);
  });

  it('builds an SVG path with one point per segment plus the start', () => {
    const shot = shotBetween({ x: 100, z: 1100 }, { x: 500, z: 300 })!;
    const d = arcPath(makeProjector(lines, tilted), shot, 0, 1, 8);
    expect(d.startsWith('M')).toBe(true);
    expect(d.split('L').length).toBe(9);
  });
});

describe('courtPointFromScreen', () => {
  it('round-trips through the flat projector', () => {
    const project = makeProjector(lines, flat);
    const pt = courtPointFromScreen(200, 400, lines);
    const [px, py] = project(pt.x, pt.z, 0);
    expect(px).toBeCloseTo(200, 6);
    expect(py).toBeCloseTo(400, 6);
  });
});
