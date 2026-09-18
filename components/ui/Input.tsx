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
import { Colors } from '@/constants/Colors';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
  secure?: boolean;
}

export function Input({ label, error, rightIcon, secure, style, ...props }: Props) {
  const [isSecure, setIsSecure] = useState(secure);

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color={Colors.textMuted} style={styles.label}>
          {label}
        </Text>
      )}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          placeholderTextColor={Colors.textDisabled}
          secureTextEntry={isSecure}
          style={[styles.input, style]}
          {...props}
        />
        {secure && (
          <TouchableOpacity onPress={() => setIsSecure((prev) => !prev)} style={styles.icon}>
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
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
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    minHeight: 52,
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
  icon: {
    marginLeft: 8,
  },
  error: {
    marginTop: 4,
  },
});
