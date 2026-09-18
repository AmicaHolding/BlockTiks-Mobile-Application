import { View, ViewStyle, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/Colors';

type Falsy = false | null | undefined;
type StyleProp = ViewStyle | Falsy | (ViewStyle | Falsy)[];

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 'pressed' | 'light';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

interface PressableCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 'pressed' | 'light';
}

export function PressableCard({ children, style, variant = 'default', ...props }: PressableCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={[styles.base, styles[variant], style]} {...props}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.backgroundElevated,
  },
  default: {
    backgroundColor: Colors.backgroundElevated,
  },
  elevated: {
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ghost: {
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: 0,
  },
  light: {
    backgroundColor: Colors.surfaceCard,
  },
});
