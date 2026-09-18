import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

interface Props extends TextProps {
  variant?: 'display' | 'heading1' | 'heading2' | 'heading3' | 'body' | 'bodySmall' | 'caption' | 'label';
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  center?: boolean;
}

export function Text({
  variant = 'body',
  color = Colors.text,
  weight = 'regular',
  center = false,
  style,
  ...props
}: Props) {
  return (
    <RNText
      style={[
        styles.base,
        styles[variant],
        styles[weight],
        { color },
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
    lineHeight: 46,
    letterSpacing: -1.2,
  },
  heading1: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
  },
  heading2: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.44,
  },
  heading3: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.18,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.24,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  regular: {
    fontFamily: 'Inter_400Regular',
  },
  medium: {
    fontFamily: 'Inter_500Medium',
  },
  semibold: {
    fontFamily: 'Inter_600SemiBold',
  },
  bold: {
    fontFamily: 'Inter_700Bold',
  },
  center: {
    textAlign: 'center',
  },
});
