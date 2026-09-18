import { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors, Radius } from '@/constants/Colors';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secure?: boolean;
  containerStyle?: View['props']['style'];
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  secure,
  style,
  containerStyle,
  ...props
}: Props) {
  const [isSecure, setIsSecure] = useState(secure);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="bodySmall" weight="medium" color={Colors.textMuted} style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          leftIcon ? styles.withLeftIcon : undefined,
          error ? styles.inputError : undefined,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={Colors.textDim}
          secureTextEntry={isSecure}
          style={[styles.input, style]}
          {...props}
        />
        {secure && (
          <TouchableOpacity onPress={() => setIsSecure((prev) => !prev)} style={styles.icon}>
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textDim}
            />
          </TouchableOpacity>
        )}
        {!secure && rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
      {error && (
        <Text variant="caption" color={Colors.error} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  withLeftIcon: {
    paddingLeft: 12,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: 10,
  },
  icon: {
    marginLeft: 8,
  },
  error: {
    marginTop: 6,
  },
});
