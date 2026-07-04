import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';
import { LINE_UNITS, LinesRect } from './CourtSvg';
import { palette, radii, sora } from '../constants/theme';
import {
  arcPath,
  courtLinesPath,
  CourtPoint,
  COURT_H,
  COURT_W,
  makeProjector,
  NET_POST_H,
  NET_X0,
  NET_X1,
  NET_Y,
  PHI_MAX,
  Projected,
  REST_STEP_MS,
  Shot,
  shotBetween,
  shotPos,
  THETA_DEFAULT,
  THETA_MAX,
  THETA_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../utils/court3d';

export interface Pin3D extends CourtPoint {
  color: string;
  size: number;
}

export interface Step3D {
  players: Pin3D[];
  shuttle: CourtPoint;
}

interface Court3DViewProps {
  width: number;
  height: number;
  linesRect: LinesRect;
  /** Tilt blend, tweened by the parent: 0 = flat, 1 = full 3D. */
  b: number;
  /** History up to and including the current step; the last entry is shown. */
  steps: Step3D[];
  playing: boolean;
  /** Called when the current flight (plus landing hold) finishes. */
  onAdvance: () => void;
  showPlayerTrails: boolean;
  showShuttleTrail: boolean;
  shuttleSize: number;
  /** Distance from the bottom for the gesture hint chip (clears the dock). */
  hintBottom: number;
}

// Flight time fraction: hold on the landed shuttle for a beat (matches the
// design prototype) before the step advances.
const HOLD_END = 1.32;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Marker glyphs traced from the design prototype (24-unit viewBox).
const PERSON_BODY = 'M4.5 20.5c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6Z';
const SHUTTLE_STROKES = 'M12 14.5 7 4.5m5 10V4m0 10.5L17 4.5';

export function Court3DView({
  width,
  height,
  linesRect,
  b,
  steps,
  playing,
  onAdvance,
  showPlayerTrails,
  showShuttleTrail,
  shuttleSize,
  hintBottom,
}: Court3DViewProps) {
  const stepIndex = steps.length - 1;
  const [cam, setCam] = useState({ thetaDeg: THETA_DEFAULT, phiDeg: 0, zoom: 1 });
  // tp starts landed (1) so entering 3D shows the board exactly where 2D left
  // it; it rewinds to 0 (replaying the flight in) only when the step changes.
  const [tp, setTp] = useState(1);
  const tpRef = useRef(1);
  const shownStep = useRef(stepIndex);

  useEffect(() => {
    if (shownStep.current !== stepIndex) {
      shownStep.current = stepIndex;
      tpRef.current = 0;
      setTp(0);
    }
  }, [stepIndex]);

  const shot: Shot | null = useMemo(() => {
    if (stepIndex < 1) return null;
    return shotBetween(steps[stepIndex - 1].shuttle, steps[stepIndex].shuttle);
  }, [steps, stepIndex]);

  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  useEffect(() => {
    if (!playing) return;
    const dur = shot ? shot.dur : REST_STEP_MS;
    let raf = 0;
    let last: number | null = null;
    let advanced = false;
    const tick = (now: number) => {
      if (last != null) {
        const next = tpRef.current + Math.min(50, now - last) / dur;
        if (next >= HOLD_END) {
          advanced = true;
          onAdvanceRef.current();
        } else {
          tpRef.current = next;
          setTp(next);
        }
      }
      last = now;
      if (!advanced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stepIndex, shot]);

  // Orbit drag / pinch zoom. Raw responder state lives in a ref; deltas apply
  // to cam state per move event.
  const touchRef = useRef<{ single: [number, number] | null; pinchD: number | null }>({
    single: null,
    pinchD: null,
  });

  const readTouches = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    const t = touchRef.current;
    if (touches.length >= 2) {
      const d = Math.hypot(
        touches[0].pageX - touches[1].pageX,
        touches[0].pageY - touches[1].pageY
      );
      if (t.pinchD != null && t.pinchD > 4) {
        const r = d / t.pinchD;
        setCam((c) => ({ ...c, zoom: clamp(c.zoom * r, ZOOM_MIN, ZOOM_MAX) }));
      }
      t.pinchD = d;
      t.single = null;
    } else if (touches.length === 1) {
      const px = touches[0].pageX;
      const py = touches[0].pageY;
      if (t.single) {
        const dx = px - t.single[0];
        const dy = py - t.single[1];
        setCam((c) => ({
          ...c,
          thetaDeg: clamp(c.thetaDeg - dy * 0.22, THETA_MIN, THETA_MAX),
          phiDeg: clamp(c.phiDeg + dx * 0.12, -PHI_MAX, PHI_MAX),
        }));
      }
      t.single = [px, py];
      t.pinchD = null;
    }
  };

  const clearTouches = () => {
    touchRef.current.single = null;
    touchRef.current.pinchD = null;
  };

  if (!steps.length) return null;

  const project = makeProjector(linesRect, { ...cam, b });
  const lineWidth = Math.max(1.5, LINE_UNITS * (linesRect.width / COURT_W));
  const tc = Math.min(1, tp);

  // Scene geometry
  const corner = (x: number, z: number) => project(x, z, 0);
  const floorPts = [corner(0, 0), corner(COURT_W, 0), corner(COURT_W, COURT_H), corner(0, COURT_H)]
    .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ');
  const linesD = courtLinesPath(project);

  const nb1 = project(NET_X0, NET_Y, 0);
  const nb2 = project(NET_X1, NET_Y, 0);
  const nt1 = project(NET_X0, NET_Y, NET_POST_H);
  const nt2 = project(NET_X1, NET_Y, NET_POST_H);
  const seg = (a: Projected, c: Projected) =>
    `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  const netPts = [nb1, nb2, nt2, nt1].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  // Ghost arcs of the flights already played
  let ghostD = '';
  if (showShuttleTrail) {
    for (let k = 1; k < stepIndex; k++) {
      const g = shotBetween(steps[k - 1].shuttle, steps[k].shuttle);
      if (g) ghostD += arcPath(project, g, 0, 1, 16) + ' ';
    }
  }

  const cur = steps[stepIndex];
  const prev = stepIndex > 0 ? steps[stepIndex - 1] : null;

  // Shuttle: mid-flight along the shot, or resting on the current spot
  const shuttleCourt = shot ? shotPos(shot, tc) : [cur.shuttle.x, cur.shuttle.z, 0];
  const sp3 = project(shuttleCourt[0], shuttleCourt[1], shuttleCourt[2]);
  const gp = project(shuttleCourt[0], shuttleCourt[1], 0);
  const land = shot ? project(shot.p1.x, shot.p1.z, 0) : null;
  const sw = shuttleSize * clamp(sp3[2], 0.8, 1.3);
  const squash = 1 - 0.58 * b; // ground ellipses foreshorten with the tilt

  // Player pins glide between the previous and current step with the flight
  const pins = cur.players.map((p, i) => {
    const from = prev?.players[i] ?? p;
    const t = prev ? tc : 1;
    const x = from.x + (p.x - from.x) * t;
    const z = from.z + (p.z - from.z) * t;
    const f = project(x, z, 0);
    const w = p.size * clamp(f[2], 0.8, 1.3);
    const stemH = Math.max(0, 13 * b * f[2]);
    // Flat: disc centered on its court spot; tilted: disc stands on a stem.
    const discCy = f[1] - stemH - w / 2 + (w / 2 + 3) * (1 - b);
    const glyph = w * 0.44;
    return { key: i, color: p.color, fx: f[0], fy: f[1], w, stemH, discCy, glyph };
  });

  const playerTrails =
    showPlayerTrails && prev
      ? cur.players
          .map((p, i) => {
            const from = prev.players[i];
            if (!from || (from.x === p.x && from.z === p.z)) return null;
            const a = project(from.x, from.z, 0);
            const c = project(p.x, p.z, 0);
            return { key: i, x1: a[0], y1: a[1], x2: c[0], y2: c[1] };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null)
      : [];

  const shuttleGlyph = sw * 0.46;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} pointerEvents="none">
        <Defs>
          <LinearGradient id="court3dBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.courtTop} />
            <Stop offset="0.55" stopColor={palette.courtMid} />
            <Stop offset="1" stopColor={palette.courtBottom} />
          </LinearGradient>
          <LinearGradient id="fog3d" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.courtTop} stopOpacity={1} />
            <Stop offset="1" stopColor={palette.courtTop} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill="url(#court3dBg)" />
        <Polygon points={floorPts} fill="rgba(0,0,0,0.08)" />
        <Path d={linesD} stroke={palette.courtLine} strokeWidth={lineWidth} strokeLinecap="round" fill="none" />
        <Path
          d={seg(nb1, nb2)}
          stroke="#FFFFFF"
          strokeOpacity={0.85}
          strokeWidth={3.2}
          strokeDasharray="2 8"
          strokeLinecap="round"
          fill="none"
        />
        {b > 0.02 && (
          <Rect
            x={0}
            y={0}
            width={width}
            height={linesRect.y + linesRect.height * 0.27}
            fill="url(#fog3d)"
            opacity={0.85 * b}
          />
        )}
        {!!ghostD && (
          <Path d={ghostD} stroke={palette.accent} strokeOpacity={0.22} strokeWidth={3} strokeLinecap="round" fill="none" />
        )}
        <Polygon points={netPts} fill="rgba(255,255,255,0.14)" />
        <Path d={seg(nt1, nt2)} stroke="#FFFFFF" strokeOpacity={0.95} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        <Path
          d={`${seg(nb1, nt1)} ${seg(nb2, nt2)}`}
          stroke="#FFFFFF"
          strokeOpacity={0.7}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />

        {playerTrails.map((t) => (
          <Line
            key={`ptrail-${t.key}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#FFFFFF"
            strokeOpacity={0.6}
            strokeWidth={2.5}
            strokeDasharray="1 8"
            strokeLinecap="round"
          />
        ))}

        {shot && showShuttleTrail && land && (
          <>
            <Ellipse
              cx={land[0]}
              cy={land[1]}
              rx={11 * land[2]}
              ry={11 * land[2] * squash}
              fill="none"
              stroke={palette.accent}
              strokeWidth={2.5}
              strokeDasharray="2 5"
            />
            <Path
              d={arcPath(project, shot, 0, 1)}
              stroke={palette.accent}
              strokeOpacity={0.32}
              strokeWidth={3}
              strokeDasharray="3 9"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={arcPath(project, shot, 0, Math.max(0.001, tc))}
              stroke={palette.accent}
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
            />
            <Line
              x1={sp3[0]}
              y1={sp3[1] + sw * 0.4}
              x2={gp[0]}
              y2={gp[1] - 1}
              stroke="#FFFFFF"
              strokeOpacity={0.9}
              strokeWidth={2.5}
              strokeDasharray="1 7"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Ground contact shadow under the shuttle */}
        <Ellipse cx={gp[0]} cy={gp[1]} rx={13 * gp[2]} ry={13 * gp[2] * squash} fill="rgba(0,0,0,0.34)" />

        {/* Player pins: floor shadow, stem, disc with person glyph */}
        {pins.map((p) => (
          <G key={`pin-${p.key}`}>
            <Ellipse
              cx={p.fx}
              cy={p.fy}
              rx={(p.w * 0.74) / 2}
              ry={(p.w * 0.28) / 2}
              fill="rgba(0,0,0,0.33)"
              opacity={0.25 + 0.75 * b}
            />
            {p.stemH > 0.5 && (
              <Line
                x1={p.fx}
                y1={p.fy}
                x2={p.fx}
                y2={p.fy - p.stemH}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            )}
            <Circle
              cx={p.fx}
              cy={p.discCy}
              r={p.w / 2}
              fill={p.color}
              stroke="rgba(255,255,255,0.95)"
              strokeWidth={2.5}
            />
            <G
              transform={`translate(${p.fx - p.glyph / 2}, ${p.discCy - p.glyph / 2}) scale(${p.glyph / 24})`}
            >
              <Circle cx={12} cy={8.2} r={4} fill="#FFFFFF" />
              <Path d={PERSON_BODY} fill="#FFFFFF" />
            </G>
          </G>
        ))}

        {/* Shuttle chip */}
        <Circle cx={sp3[0]} cy={sp3[1]} r={sw / 2} fill="#FFFFFF" />
        <G
          transform={`translate(${sp3[0] - shuttleGlyph / 2}, ${sp3[1] - shuttleGlyph / 2}) scale(${shuttleGlyph / 24})`}
        >
          <Path
            d={SHUTTLE_STROKES}
            stroke={palette.shuttleGlyph}
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={12} cy={18.4} r={3} fill={palette.shuttleGlyph} />
        </G>
      </Svg>

      {/* Orbit / pinch surface (dock and header sit above and win touches) */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={readTouches}
        onResponderMove={readTouches}
        onResponderRelease={clearTouches}
        onResponderTerminate={clearTouches}
      />

      {b > 0.5 && (
        <View pointerEvents="none" style={[styles.hintWrap, { bottom: hintBottom }]}>
          <View style={styles.hintPill}>
            <MaterialCommunityIcons name="rotate-3d" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={styles.hintText}>drag to orbit · pinch to zoom</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(6, 26, 18, 0.6)',
    borderWidth: 1,
    borderColor: palette.glassPillBorder,
  },
  hintText: {
    ...sora('600'),
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
