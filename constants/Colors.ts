export const Colors = {
  background: '#0B0B0F',
  backgroundElevated: '#15151C',
  surface: '#1E1E28',
  primary: '#E91E63',
  primaryDark: '#C2185B',
  primaryLight: '#F48FB1',
  text: '#FFFFFF',
  textMuted: '#A0A0B0',
  textDisabled: '#6C6C7C',
  border: '#2A2A36',
  divider: '#2A2A36',
  success: '#4CAF50',
  error: '#EF5350',
  warning: '#FFB74D',
  overlay: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const Theme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.backgroundElevated,
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
