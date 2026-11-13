/**
 * BlockTiks design tokens — Luma-minimal direction.
 *
 * Core idea:
 * - Near-black canvas, photography-led event cards, generous whitespace.
 * - One electric violet accent used sparingly (active states, links, live).
 * - Primary CTA is a white pill; accent is never the main button.
 * - Manrope for display/headings, Inter for body/UI.
 */

export const Colors = {
  // Brand
  primary: '#7c5cff',
  primaryBright: '#9b85ff',
  primaryDeep: '#6a4ae0',
  onPrimary: '#ffffff',

  // Canvas
  background: '#0a0a0b',
  backgroundElevated: '#141416',
  backgroundDeep: '#08080a',
  surface: '#1c1c1f',
  surfaceSoft: '#1c1c1f',
  surfaceCard: '#ffffff',

  // Text
  text: '#f5f5f7',
  textMuted: 'rgba(245,245,247,0.64)',
  textDim: 'rgba(245,245,247,0.4)',
  ink: '#0a0a0b',
  inkMuted: '#6b6b70',

  // Dividers & outlines
  divider: 'rgba(255,255,255,0.08)',
  hairlineLight: '#e8e8ec',
  hairlineStrong: '#0a0a0b',

  // Status
  success: '#34c77b',
  successBright: '#43ff00',
  successDark: '#1d7a4f',
  error: '#ff5c5c',
  warning: '#ff9f43',
  info: '#5c8dff',

  // Pure
  white: '#ffffff',
  black: '#000000',
} as const;

export const Spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  block: 64,
} as const;

export const Radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Typography = {
  display: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  heading1: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  heading2: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heading3: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
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
    heavy: { fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  },
};

export type Theme = typeof Theme;
