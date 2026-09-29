/**
 * Single source of truth for ChordApp's design system tokens.
 * Every screen and component built must import from this file rather than hardcoding
 * any color, font, or spacing value.
 */

export const COLORS = {
  paper: '#F6F4EF',
  ink: '#22242A',
  inkSoft: '#83807A',
  teal: '#2E6B63',
  tealSoft: '#DCEAE7',
  whiteKey: '#FDFCFA',
  whiteKeyEdge: '#E3E0D8',
  blackKey: '#1C1E22',
} as const;

export const FONTS = {
  display: {
    medium: 'SpaceGrotesk_500Medium',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  body: {
    regular: 'IBMPlexSans_400Regular',
    medium: 'IBMPlexSans_500Medium',
    semiBold: 'IBMPlexSans_600SemiBold',
  },
} as const;

export const TYPE_SCALE = {
  chordName: 46,
  screenTitle: 22,
  body: 14,
  subtext: 13,
  label: 12,
  caption: 11.5,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  buttonPadding: 14,
  lg: 16,
  xl: 22,
  xxl: 32,
  mark: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 13,
  card: 13,
  button: 13,
  mark: 13,
  full: 9999,
} as const;

export const OPACITY = {
  caption: 0.75,
  pressed: 0.85,
} as const;

export const STROKE = {
  thin: 1,
  medium: 2,
  thick: 3,
} as const;

export const LINE_HEIGHT = {
  subtext: 1.5,
} as const;

export const LAYOUT = {
  contentMaxWidth: 400,
  buttonMaxWidth: 340,
} as const;

export type Color = typeof COLORS[keyof typeof COLORS];
export type Font = typeof FONTS;
export type TypeScale = typeof TYPE_SCALE[keyof typeof TYPE_SCALE];
export type Spacing = typeof SPACING[keyof typeof SPACING];
export type Radius = typeof RADIUS[keyof typeof RADIUS];
export type Opacity = typeof OPACITY[keyof typeof OPACITY];
export type Stroke = typeof STROKE[keyof typeof STROKE];
export type LineHeight = typeof LINE_HEIGHT[keyof typeof LINE_HEIGHT];
export type Layout = typeof LAYOUT[keyof typeof LAYOUT];
