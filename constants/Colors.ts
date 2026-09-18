/**
 * BlockTiks design tokens — adapted from Revolut's high-contrast,
 * editorial two-mode system for an event-ticketing product.
 *
 * Core idea:
 * - Canvas is near-black for immersive event storytelling.
 * - Cards and form surfaces are elevated dark or clean light.
 * - Primary accent is a saturated cobalt-violet.
 * - Buttons are full pills; chips and inputs are rounded.
 * - Typography is tight display + Inter body.
 */

export const Colors = {
  // Brand
  primary: '#494fdf',
  primaryBright: '#4f55f1',
  primaryDeep: '#3a40c4',
  onPrimary: '#ffffff',

  // Canvas
  background: '#000000',
  backgroundElevated: '#16181a',
  backgroundDeep: '#0a0a0a',
  surface: '#1f2226',
  surfaceSoft: '#f4f4f4',
  surfaceCard: '#ffffff',

  // Text
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.72)',
  textDim: 'rgba(255,255,255,0.52)',
  ink: '#191c1f',
  inkMuted: '#505a63',

  // Dividers & outlines
  divider: 'rgba(255,255,255,0.12)',
  hairlineLight: '#e2e2e7',
  hairlineStrong: '#191c1f',

  // Status
  success: '#00a87e',
  successBright: '#43FF00',
  successDark: '#006400',
  error: '#e23b4a',
  warning: '#ec7e00',
  info: '#376cd5',

  // Pure
  white: '#ffffff',
  black: '#000000',
} as const;

export const Spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 14,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  block: 80,
} as const;

export const Radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const Typography = {
  display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -0.96,
  },
  heading1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.48,
  },
  heading2: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
  },
  heading3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.18,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.24,
  },
  bodySmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
} as const;

export const Theme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.backgroundElevated,
    text: Colors.text,
    border: Colors.divider,
    notification: Colors.primary,
  },
  fonts: {
    regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
    medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
    bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
    heavy: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  },
};

export type Theme = typeof Theme;
