import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Input, Screen, IconButton, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { ApiUrls } from '@/constants/Api';
import { api } from '@/services/api';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { show } = useToast();

  const handleSignIn = async () => {
    if (!email || !password) {
      show('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      // Replace with real API call when backend is ready
      const response = await api.post<{
        token?: string;
        refreshToken?: string;
        firstName?: string;
        lastName?: string;
      }>(ApiUrls.login, { email, password }).catch(() => null);

      // Mock successful sign in for Expo Go preview
      await setAuth(
        response?.token || 'mock_token',
        response?.refreshToken || 'mock_refresh',
        {
          email,
          firstName: response?.firstName || 'Block',
          lastName: response?.lastName || 'Tiks',
          role: 'user',
        }
      );
      show('Welcome back!', 'success');
    } catch (error) {
      show('Sign in failed. Try again.', 'error');
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
        Sign In
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Welcome back! Please enter your details.
      </Text>

      <Input
        label="Email"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="Password"
        placeholder="Enter your password"
        secure
        value={password}
        onChangeText={setPassword}
      />

      <Button
        title="Forgot password?"
        variant="ghost"
        size="small"
        fullWidth={false}
        onPress={() => router.push('/(auth)/forgot-password')}
        style={styles.forgot}
      />

      <Button title="Sign In" loading={loading} onPress={handleSignIn} />

      <View style={styles.footer}>
        <Text variant="bodySmall" color={Colors.textMuted}>
          Don't have an account?
        </Text>
        <Button
          title="Sign Up"
          variant="ghost"
          size="small"
          fullWidth={false}
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>
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
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
});
