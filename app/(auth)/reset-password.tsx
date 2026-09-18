import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Input, Button, useToast, IconButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      show('Password must be at least 6 characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      show('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Password reset successfully', 'success');
      router.replace('/(auth)/sign-in');
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <IconButton name="chevron-back" onPress={() => router.back()} style={styles.back} />
      <Text variant="heading1" weight="bold" style={styles.title}>
        Reset Password
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Create a new secure password for your account.
      </Text>

      <Input
        label="New Password"
        placeholder="Enter new password"
        secure
        value={password}
        onChangeText={setPassword}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
      />
      <Input
        label="Confirm Password"
        placeholder="Confirm new password"
        secure
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
      />

      <Button title="Reset Password" loading={loading} onPress={handleSubmit} style={styles.submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing.xxl,
  },
  submit: {
    marginTop: Spacing.lg,
  },
});
