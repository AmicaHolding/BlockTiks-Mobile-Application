import { View, ViewStyle, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Colors } from '@/constants/Colors';

type Falsy = false | null | undefined;
type StyleProp = ViewStyle | Falsy | (ViewStyle | Falsy)[];

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

interface PressableCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp;
  variant?: 'default' | 'elevated' | 'outline' | 'ghost';
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
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.backgroundElevated,
  },
  default: {
    backgroundColor: Colors.backgroundElevated,
  },
  elevated: {
    backgroundColor: Colors.surface,
  },
  outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: Colors.transparent,
    padding: 0,
    borderRadius: 0,
  },
});
