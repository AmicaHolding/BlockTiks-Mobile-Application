import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

interface Props extends TextProps {
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'bodySmall' | 'caption' | 'label';
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
  heading1: {
    fontSize: 32,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    lineHeight: 28,
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
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
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
