import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { Colors, Radius } from '@/constants/Colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark';
type ButtonSize = 'small' | 'medium' | 'large';

interface Props extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  size = 'large',
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  const textColorMap: Record<ButtonVariant, string> = {
    primary: Colors.ink,
    secondary: Colors.text,
    outline: Colors.text,
    ghost: Colors.primary,
    dark: Colors.text,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColorMap[variant]} />
      ) : (
        <>
          {leftIcon}
          <Text
            variant="bodySmall"
            weight="semibold"
            color={textColorMap[variant]}
            style={leftIcon || rightIcon ? styles.textWithIcon : undefined}
          >
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  large: {
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: Colors.white,
  },
  secondary: {
    backgroundColor: Colors.backgroundElevated,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  dark: {
    backgroundColor: Colors.surface,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  textWithIcon: {
    marginHorizontal: 8,
  },
});
