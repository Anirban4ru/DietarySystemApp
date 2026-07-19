import { StyleSheet } from 'react-native';

export const palette = {
  // Soft backgrounds
  bone: '#F8F9FA',
  paper: '#F1F3F5',
  chalk: '#FFFFFF',
  ink: '#1A1D20',
  slate: '#343A40',
  slate2: '#495057',
  slate3: '#868E96',
  mist: '#ADB5BD',
  mist2: '#CED4DA',
  hair: '#E9ECEF',
  hairLight: 'rgba(255,255,255,0.4)',

  // Professional muted accents
  sage: '#8FBC8F',
  sageDeep: '#2E8B57',
  sageMist: '#E0EEE0',
  clay: '#D2B48C',
  clayDeep: '#8B4513',
  amber: '#F4A460',
  amberDeep: '#D2691E',
  crimson: '#CD5C5C',
  crimsonMist: '#F08080',

  // Semantic
  success: '#2E8B57',
  warning: '#D2691E',
  danger: '#CD5C5C',

  // Dark mode (subtle elegant)
  darkBg: '#121212',
  darkSurface: '#1E1E1E',
  darkBorder: '#2C2C2C',
  darkText: '#F8F9FA',
  darkMist: '#ADB5BD',
} as const;

export type Palette = typeof palette;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export const font = {
  sans: 'Inter-Regular',
  sansMed: 'Inter-Medium',
  sansBold: 'Inter-Bold',
  display: 'SpaceGrotesk-Bold',
  displayReg: 'SpaceGrotesk-Regular',
} as const;

export const type = {
  display: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontWeight: '700' as any,
  },
  h1: {
    fontFamily: font.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontWeight: '700' as any,
  },
  h2: {
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontWeight: '700' as any,
  },
  h3: {
    fontFamily: font.displayReg,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: '400' as any,
  },
  body: {
    fontFamily: font.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as any,
    fontWeight: '700' as any,
  },
  mono: {
    fontFamily: font.sansMed,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  monoBold: {
    fontFamily: font.sansBold,
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: '700' as any,
  },
} as const;

// Modern subtle border widths
export const border = {
  thin: 1,
  md: 1,
  thick: 0,
  heavy: 0,
} as const;

