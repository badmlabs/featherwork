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

interface CourtSvgProps {
  width: number;
  height: number;
}

/**
 * Programmatically drawn badminton court (portrait, net across the middle).
 * Uses real court proportions: doubles court 6.10m x 13.40m, singles
 * sidelines 0.46m in, short service lines 1.98m from the net, doubles long
 * service lines 0.76m from the back boundary.
 */
function CourtSvgComponent({ width, height }: CourtSvgProps) {
  // Arena floor margin and out-of-bounds apron around the painted lines.
  const floorRadius = 24;
  const apronInset = 6;
  const padX = Math.max(16, width * 0.055);
  const padY = Math.max(22, height * 0.05);

  // Painted court boundary (doubles court).
  const x0 = apronInset + padX;
  const x1 = width - apronInset - padX;
  const y0 = apronInset + padY;
  const y1 = height - apronInset - padY;
  const courtW = x1 - x0;
  const courtH = y1 - y0;

  const netY = (y0 + y1) / 2;
  const singlesInset = courtW * (46 / 610);
  const shortServiceOffset = courtH * (198 / 1340);
  const longServiceInset = courtH * (76 / 1340);
  const centerX = (x0 + x1) / 2;

  const line = {
    stroke: palette.courtLine,
    strokeWidth: 2,
  };

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="matGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.courtMatLight} />
          <Stop offset="0.5" stopColor={palette.courtMat} />
          <Stop offset="1" stopColor={palette.courtMatLight} />
        </LinearGradient>
        <LinearGradient id="apronGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.courtApronEdge} />
          <Stop offset="1" stopColor={palette.courtApron} />
        </LinearGradient>
      </Defs>

      {/* Arena floor */}
      <Rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={floorRadius}
        fill={palette.surfaceSunken}
        stroke={palette.hairline}
        strokeWidth={1}
      />

      {/* Out-of-bounds apron */}
      <Rect
        x={apronInset}
        y={apronInset}
        width={width - apronInset * 2}
        height={height - apronInset * 2}
        rx={floorRadius - 6}
        fill="url(#apronGradient)"
      />

      {/* Court mat (in-bounds area) */}
      <Rect x={x0} y={y0} width={courtW} height={courtH} fill="url(#matGradient)" />

      {/* Outer boundary (doubles court) */}
      <Rect
        x={x0}
        y={y0}
        width={courtW}
        height={courtH}
        fill="none"
        {...line}
      />

      {/* Singles sidelines */}
      <Line x1={x0 + singlesInset} y1={y0} x2={x0 + singlesInset} y2={y1} {...line} />
      <Line x1={x1 - singlesInset} y1={y0} x2={x1 - singlesInset} y2={y1} {...line} />

      {/* Doubles long service lines */}
      <Line x1={x0} y1={y0 + longServiceInset} x2={x1} y2={y0 + longServiceInset} {...line} />
      <Line x1={x0} y1={y1 - longServiceInset} x2={x1} y2={y1 - longServiceInset} {...line} />

      {/* Short service lines */}
      <Line x1={x0} y1={netY - shortServiceOffset} x2={x1} y2={netY - shortServiceOffset} {...line} />
      <Line x1={x0} y1={netY + shortServiceOffset} x2={x1} y2={netY + shortServiceOffset} {...line} />

      {/* Center lines (from short service line to back boundary) */}
      <Line x1={centerX} y1={y0} x2={centerX} y2={netY - shortServiceOffset} {...line} />
      <Line x1={centerX} y1={netY + shortServiceOffset} x2={centerX} y2={y1} {...line} />

      {/* Net: mesh suggestion + tape + posts */}
      <Line
        x1={x0 - 8}
        y1={netY}
        x2={x1 + 8}
        y2={netY}
        stroke={palette.courtNet}
        strokeOpacity={0.45}
        strokeWidth={7}
        strokeDasharray="2 3"
      />
      <Line
        x1={x0 - 8}
        y1={netY}
        x2={x1 + 8}
        y2={netY}
        stroke={palette.courtNet}
        strokeWidth={2.5}
      />
      <Circle cx={x0 - 8} cy={netY} r={4.5} fill={palette.courtNet} />
      <Circle cx={x1 + 8} cy={netY} r={4.5} fill={palette.courtNet} />
    </Svg>
  );
}

export const CourtSvg = React.memo(CourtSvgComponent);
