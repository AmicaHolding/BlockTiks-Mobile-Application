import { Colors } from '@/constants/Colors';
import { Text as RNText, StyleSheet, TextProps } from 'react-native';

interface Props extends TextProps {
  variant?: 'display' | 'heading1' | 'heading2' | 'heading3' | 'body' | 'bodySmall' | 'caption' | 'label';
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  center?: boolean;
}

const DISPLAY_VARIANTS = new Set(['display', 'heading1', 'heading2', 'heading3']);

export function Text({
  variant = 'body',
  color = Colors.text,
  weight = 'regular',
  center = false,
  style,
  ...props
}: Props) {
  const isDisplay = DISPLAY_VARIANTS.has(variant);
  const family = isDisplay
    ? weight === 'bold'
      ? 'Manrope_700Bold'
      : weight === 'semibold'
        ? 'Manrope_600SemiBold'
        : 'Manrope_600SemiBold'
    : weight === 'bold'
      ? 'Inter_700Bold'
      : weight === 'semibold'
        ? 'Inter_600SemiBold'
        : weight === 'medium'
          ? 'Inter_500Medium'
          : 'Inter_400Regular';

  return (
    <RNText
      style={[
        styles.base,
        styles[variant],
        { color, fontFamily: family },
        center && styles.center,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.text,
  },
  display: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  heading1: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  heading2: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heading3: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  center: {
    textAlign: 'center',
  },
});
