import { StyleSheet } from 'react-native';

export const palette = {
  // ── Exact Palette from Reference ──────────────────────────────
  // 1. Royal Green Qilin (#02332D) — Signature luxury brand color
  royalGreen:   '#02332D',
  sage:         '#0A423B',    // Mid royal green
  sageDeep:     '#02332D',    // Signature Royal Green Qilin
  forestDeep:   '#02332D',    // Signature Royal Green Qilin
  sageMist:     '#E5EBEA',    // Pale Royal Green tint

  // 2. White Cream (#DACFBD) — Warm luxurious canvas & neutrals
  whiteCream:   '#DACFBD',
  cream:        '#DACFBD',
  bone:         '#DACFBD',    // White Cream primary bg
  paper:        '#EFE8DC',    // Soft cream card surface
  chalk:        '#F7F3EB',    // Pure elevated cream surface
  ink:          '#0D1C1A',    // Very dark rich Qilin charcoal
  slate:        '#2C261F',    // Dark bronze taupe
  slate2:       '#594E42',    // Warm muted stone
  mist:         '#9E907F',    // Muted taupe
  mist2:        '#C2B4A0',    // Soft cream border
  hair:         '#C0B19C',    // Refined subtle border
  hairLight:    'rgba(255,255,255,0.25)',

  // 3. Golden Days (#BF9861) — Rich gold & warm saffron accent
  goldenDays:   '#BF9861',
  amber:        '#BF9861',    // Golden Days
  amberDeep:    '#9E7538',    // Deep burnished bronze
  clay:         '#BF9861',    // Warm gold
  clayDeep:     '#8A5E24',    // Deep warm amber
  saffron:      '#BF9861',    // Rich Golden Days attention color
  goldMist:     '#F5EEDB',    // Soft champagne gold mist

  // 4. Red Phoenix (#7F1100) — Deep ruby crimson urgency & destruction
  redPhoenix:   '#7F1100',
  crimson:      '#7F1100',    // Deep Red Phoenix
  burgundy:     '#7F1100',    // Deep Red Phoenix
  crimsonMist:  '#FCE8E6',    // Soft blush phoenix mist

  // ── Semantic ──────────────────────────────────────────────────
  success:      '#02332D',    // Royal Green Qilin
  warning:      '#BF9861',    // Golden Days
  danger:       '#7F1100',    // Red Phoenix

  // ── Dark mode (Deep espresso & dark Qilin) ────────────────────
  darkBg:       '#081210',    // Deep dark Qilin black
  darkSurface:  '#0E201D',    // Deep Qilin emerald surface
  darkBorder:   '#18332E',    // Subtle Qilin dark border
  darkText:     '#F7F3EB',    // White Cream text
  darkMist:     '#9E907F',    // Muted cream taupe
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
