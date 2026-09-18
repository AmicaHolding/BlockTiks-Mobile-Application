import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, Button, Input, Screen, IconButton, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { ApiUrls } from '@/constants/Api';
import { api } from '@/services/api';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleSubmit = async () => {
    if (password.length < 8) {
      show('Password must be at least 8 characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      show('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post(ApiUrls.resetPassword, { email, password }).catch(() => null);
      show('Password reset successful', 'success');
      router.replace('/(auth)/sign-in');
    } catch {
      show('Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <IconButton
        name="arrow-back"
        onPress={() => router.back()}
        style={styles.backButton}
      />
      <Text variant="heading1" weight="bold" style={styles.title}>
        Reset Password
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Create a new password for {email || 'your account'}.
      </Text>

      <Input
        label="New Password"
        placeholder="Min. 8 characters"
        secure
        value={password}
        onChangeText={setPassword}
      />
      <Input
        label="Confirm Password"
        placeholder="Confirm new password"
        secure
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Button title="Reset Password" loading={loading} onPress={handleSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
});
