import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, Input, Button, useToast, IconButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleSubmit = async () => {
    if (!email) {
      show('Please enter your email', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('OTP sent to your email', 'success');
      router.push('/(auth)/otp-verification');
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <IconButton name="chevron-back" onPress={() => router.back()} style={styles.back} />
      <Text variant="heading1" weight="bold" style={styles.title}>
        Forgot Password
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Enter your email and we'll send you an OTP to reset your password.
      </Text>

      <Input
        label="Email address"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Button title="Send OTP" loading={loading} onPress={handleSubmit} style={styles.submit} />
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
