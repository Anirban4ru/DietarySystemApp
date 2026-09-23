import { StyleSheet } from 'react-native';

export const palette = {
  // ── Warm Aristocratic Neutrals ────────────────────────────────
  bone:         '#FAFAF7',    // Warm ivory — primary bg
  paper:        '#F2EDE4',    // Aged parchment
  chalk:        '#FFFFFF',    // Pure white surfaces
  ink:          '#1C1917',    // Warm charcoal (not cold black)
  slate:        '#44403C',    // Warm dark gray
  slate2:       '#78716C',    // Warm stone
  mist:         '#A8A29E',    // Warm muted
  mist2:        '#D6D3D1',    // Soft warm gray
  hair:         '#E7E5E0',    // Warm light border
  hairLight:    'rgba(255,255,255,0.15)',

  // ── Signature Forest Greens (fresh herbs, nature) ─────────────
  sage:         '#3D6B35',    // Forest green
  sageDeep:     '#1E4D18',    // Deep forest
  forestDeep:   '#1E4D18',    // Semantic deep forest green
  sageMist:     '#EDF5EB',    // Mint tint

  // ── Saffron / Amber (warmth, spice, richness) ─────────────────
  clay:         '#C2781A',    // Warm amber
  clayDeep:     '#92400E',    // Deep amber / burnished copper
  amber:        '#D97706',    // Saffron gold
  amberDeep:    '#B45309',    // Rich saffron
  saffron:      '#D97706',    // Rich saffron attention color

  // ── Burgundy / Crimson (sophistication, danger) ───────────────
  crimson:      '#991B1B',    // Deep burgundy
  burgundy:     '#991B1B',    // Semantic burgundy for urgent/destructive states
  crimsonMist:  '#FEE2E2',    // Soft blush

  // ── Semantic ──────────────────────────────────────────────────
  success:      '#166534',    // Deep forest green
  warning:      '#B45309',    // Rich saffron
  danger:       '#991B1B',    // Burgundy

  // ── Dark mode (Warm espresso depths) ─────────────────────────
  darkBg:       '#0C0A09',    // Espresso black
  darkSurface:  '#1C1917',    // Warm charcoal
  darkBorder:   '#292524',    // Subtle warm dark
  darkText:     '#FAFAF9',    // Warm white
  darkMist:     '#A8A29E',    // Warm muted
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
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  24,
} as const;

export const font = {
  sans:        'Inter-Regular',
  sansMed:     'Inter-Medium',
  sansBold:    'Inter-Bold',
  display:     'SpaceGrotesk-Bold',
  displayReg:  'SpaceGrotesk-Regular',
  monoBold:    'SpaceGrotesk-Bold',
} as const;

export const type = {
  display: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontWeight: '700' as any,
  },
  h1: {
    fontFamily: font.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontWeight: '700' as any,
  },
  h2: {
    fontFamily: font.display,
    fontSize: 19,
    lineHeight: 25,
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
    lineHeight: 23,
  },
  bodySm: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontFamily: font.sansBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as any,
    fontWeight: '700' as any,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  labelSm: {
    fontFamily: font.sansBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as any,
    fontWeight: '700' as any,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  mono: {
    fontFamily: font.sansMed,
    fontSize: 12,
    letterSpacing: 0.4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  monoBold: {
    fontFamily: font.sansBold,
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: '700' as any,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
} as const;

export const border = {
  thin:  1,
  md:    1.5,
  thick: 2,
  heavy: 4,
} as const;
