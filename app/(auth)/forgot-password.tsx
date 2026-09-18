import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Input, Screen, IconButton, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { ApiUrls } from '@/constants/Api';
import { api } from '@/services/api';

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
    try {
      await api.post(ApiUrls.forgotPassword, { email }).catch(() => null);
      show('OTP sent to your email', 'success');
      router.push({ pathname: '/(auth)/otp-verification', params: { email, from: 'forgot' } });
    } catch {
      show('Failed to send OTP', 'error');
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
        Forgot Password
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Enter your email and we'll send you a verification code.
      </Text>

      <Input
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Button title="Send OTP" loading={loading} onPress={handleSubmit} />
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
