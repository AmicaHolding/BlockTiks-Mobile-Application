import { View, ViewStyle, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/Colors';

type Falsy = false | null | undefined;
type StyleProp = ViewStyle | Falsy | (ViewStyle | Falsy)[];

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 'pressed';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

interface PressableCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 'pressed';
}

export function PressableCard({ children, style, variant = 'default', ...props }: PressableCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.base, styles[variant], style]} {...props}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  default: {
    backgroundColor: Colors.surface,
  },
  elevated: {
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ghost: {
    backgroundColor: Colors.transparent,
    padding: 0,
    borderRadius: 0,
  },
});
