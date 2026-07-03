import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';

/**
 * Central design tokens for the app. All components pull colors, spacing and
 * radii from here so the look stays consistent and easy to retune.
 */
export const palette = {
  // Base surfaces (deep navy "midnight" scale)
  bg: '#0B111E',
  surface: '#131B2A',
  surfaceRaised: '#1B2536',
  surfaceSunken: '#0E1522',

  // Strokes
  hairline: 'rgba(148, 163, 184, 0.14)',
  hairlineStrong: 'rgba(148, 163, 184, 0.30)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#97A3B6',
  textMuted: '#64748B',

  // Accent (sport teal) + status colors
  accent: '#2DD4BF',
  accentSoft: 'rgba(45, 212, 191, 0.15)',
  onAccent: '#04231D',
  danger: '#FB7185',
  dangerSoft: 'rgba(251, 113, 133, 0.14)',

  overlay: 'rgba(3, 7, 15, 0.72)',

  // Court colors (BWF-style green mat)
  courtApron: '#0A5B3E',
  courtApronEdge: '#0D6B49',
  courtMat: '#10784F',
  courtMatLight: '#15895B',
  courtLine: 'rgba(250, 252, 254, 0.92)',
  courtNet: '#DBE4EE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

/** Marker color choices shown in customization UIs. */
export const markerColors = [
  { name: 'Coral', value: '#ff6b6b' },
  { name: 'Mint', value: '#4ade80' },
  { name: 'Blue', value: '#5b8cff' },
  { name: 'Amber', value: '#fbbf24' },
  { name: 'Violet', value: '#c084fc' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'White', value: '#ffffff' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Pink', value: '#f472b6' },
] as const;

/** Returns a readable foreground color for content drawn on a marker. */
export function markerContentColor(markerColor: string): string {
  return markerColor.toLowerCase() === '#ffffff' ? '#0B111E' : '#FFFFFF';
}

/** Returns the ring color drawn around a marker so it stays visible. */
export function markerRingColor(markerColor: string): string {
  return markerColor.toLowerCase() === '#ffffff'
    ? 'rgba(11, 17, 30, 0.85)'
    : 'rgba(255, 255, 255, 0.92)';
}

/** React Native Paper theme wired to the app palette. */
export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.accent,
    onPrimary: palette.onAccent,
    primaryContainer: palette.accentSoft,
    onPrimaryContainer: palette.accent,
    background: palette.bg,
    onBackground: palette.textPrimary,
    surface: palette.surface,
    onSurface: palette.textPrimary,
    surfaceVariant: palette.surfaceRaised,
    onSurfaceVariant: palette.textSecondary,
    outline: palette.hairlineStrong,
    outlineVariant: palette.hairline,
    error: palette.danger,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: palette.surface,
      level2: palette.surfaceRaised,
      level3: palette.surfaceRaised,
      level4: palette.surfaceRaised,
      level5: palette.surfaceRaised,
    },
  },
};
