import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Rect,
  Stop,
} from 'react-native-svg';
import { palette } from '../constants/theme';

export interface LinesRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CourtSvgProps {
  width: number;
  height: number;
  /** Rect the painted court lines are stretched into; the green mat fills the whole screen. */
  linesRect: LinesRect;
}

// Real BWF proportions, 1 unit = 1 cm, full doubles court 610 x 1340.
// Shared with the 3D projection (utils/court3d.ts).
export const COURT_W = 610;
export const COURT_H = 1340;
export const SINGLES_X = [46, 564];
export const LONG_SERVICE_Y = [76, 1264];
export const SHORT_SERVICE_Y = [472, 868];
export const CENTER_X = 305;
export const NET_Y = 670;
export const LINE_UNITS = 4; // real 40mm painted lines
export const NET_OVERHANG_UNITS = 20; // posts sit past the doubles sidelines

/**
 * Full-bleed "Match Point" court: green gradient edge-to-edge, white 80%
 * painted lines stretched into `linesRect`, dashed net with posts.
 */
function CourtSvgComponent({ width, height, linesRect }: CourtSvgProps) {
  const sx = linesRect.width / COURT_W;
  const sy = linesRect.height / COURT_H;
  const X = (u: number) => linesRect.x + u * sx;
  const Y = (u: number) => linesRect.y + u * sy;

  const line = {
    stroke: palette.courtLine,
    strokeWidth: Math.max(1.5, LINE_UNITS * sx),
  };

  const netY = Y(NET_Y);
  const netOverhang = NET_OVERHANG_UNITS * sx;

  return (
    <Svg width={width} height={height}>
      <Defs>
        {/* 178deg court gradient approximated as vertical */}
        <LinearGradient id="courtGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.courtTop} />
          <Stop offset="0.55" stopColor={palette.courtMid} />
          <Stop offset="1" stopColor={palette.courtBottom} />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={width} height={height} fill="url(#courtGradient)" />

      {/* Outer boundary (doubles sidelines + back boundary lines) */}
      <Rect
        x={X(0)}
        y={Y(0)}
        width={linesRect.width}
        height={linesRect.height}
        fill="none"
        {...line}
      />

      {/* Singles sidelines */}
      {SINGLES_X.map((x) => (
        <Line key={`s${x}`} x1={X(x)} y1={Y(0)} x2={X(x)} y2={Y(COURT_H)} {...line} />
      ))}

      {/* Doubles long service lines */}
      {LONG_SERVICE_Y.map((y) => (
        <Line key={`l${y}`} x1={X(0)} y1={Y(y)} x2={X(COURT_W)} y2={Y(y)} {...line} />
      ))}

      {/* Short service lines */}
      {SHORT_SERVICE_Y.map((y) => (
        <Line key={`ss${y}`} x1={X(0)} y1={Y(y)} x2={X(COURT_W)} y2={Y(y)} {...line} />
      ))}

      {/* Center lines (back boundary to short service line) */}
      <Line x1={X(CENTER_X)} y1={Y(0)} x2={X(CENTER_X)} y2={Y(SHORT_SERVICE_Y[0])} {...line} />
      <Line x1={X(CENTER_X)} y1={Y(SHORT_SERVICE_Y[1])} x2={X(CENTER_X)} y2={Y(COURT_H)} {...line} />

      {/* Net: white dashed line past both sidelines, filled post at each end */}
      <Line
        x1={X(0) - netOverhang}
        y1={netY}
        x2={X(COURT_W) + netOverhang}
        y2={netY}
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeDasharray="1 9"
        strokeLinecap="round"
      />
      <Circle cx={X(0) - netOverhang} cy={netY} r={5} fill="#FFFFFF" />
      <Circle cx={X(COURT_W) + netOverhang} cy={netY} r={5} fill="#FFFFFF" />
    </Svg>
  );
}

export const CourtSvg = React.memo(CourtSvgComponent);
