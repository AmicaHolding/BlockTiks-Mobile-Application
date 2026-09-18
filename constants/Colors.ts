// BlockTiks design tokens — extracted from the Flutter source.
// Identity: premium dark-mode event ticketing + marketplace.
// Primary purple (#B620E0), neon green success (#43FF00), near-black background (#121212).

export const Colors = {
  // Backgrounds
  background: '#121212',
  backgroundElevated: '#1E1E1E',
  surface: '#363636',
  container: '#363636',
  inputBg: 'rgba(255, 255, 255, 0.1)',

  // Brand
  primary: '#B620E0',
  primaryLight: '#D46AED',
  primaryDark: '#8A17A8',
  primaryFaded: 'rgba(182, 32, 224, 0.15)',

  // Feedback
  success: '#43FF00',
  successDark: '#38640A',
  error: '#FF1A1A',
  warning: '#FEA846',
  info: '#007AFF',

  // Text
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDisabled: 'rgba(255, 255, 255, 0.38)',
  textGrey: '#A3A8AD',
  answerColor: '#676666',

  // Borders / dividers
  border: '#707070',
  divider: '#646464',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  transparent: 'transparent',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 999,
} as const;

export const Theme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.primary,
  },
  fonts: {
    regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
    medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
    bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
    heavy: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  },
};
