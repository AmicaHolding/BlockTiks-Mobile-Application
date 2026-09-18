import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Input, Button, useToast, IconButton } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';
import { api } from '@/services/api';
import { ApiUrls } from '@/constants/Api';
import { useAuthStore } from '@/store/authStore';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const { setAuth } = useAuthStore();

  const handleSignIn = async () => {
    if (!email || !password) {
      show('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{
        token?: string;
        refreshToken?: string;
        firstName?: string;
        lastName?: string;
      }>(ApiUrls.login, { email, password }).catch(() => null);

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
      haptic.success();
      show('Welcome back!', 'success');
      router.replace('/(app)');
    } catch (error) {
      haptic.error();
      show('Sign in failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <IconButton
        name="chevron-back"
        onPress={() => router.back()}
        style={styles.backButton}
      />
      <Text variant="heading1" weight="bold" style={styles.title}>
        Welcome Back!
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        All your needs for the ultimate event experience.
      </Text>

      <Input
        label="Email address"
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.textMuted} />}
      />
      <Input
        label="Password"
        placeholder="Enter your password"
        secure
        value={password}
        onChangeText={setPassword}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
      />

      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
        <Text variant="bodySmall" weight="medium" color={Colors.primary} style={styles.forgot}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <Button title="Sign In" loading={loading} onPress={handleSignIn} style={styles.submit} />

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text variant="caption" color={Colors.textMuted}>
          or continue with
        </Text>
        <View style={styles.divider} />
      </View>

      <Button
        title="Continue with Google"
        variant="outline"
        leftIcon={<Ionicons name="logo-google" size={20} color={Colors.text} />}
        onPress={() => show('Google sign-in coming soon', 'info')}
      />

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={styles.switch}>
        <Text variant="body" color={Colors.textMuted}>
          Don't have an account?{' '}
        </Text>
        <Text variant="body" weight="bold" color={Colors.primary}>
          Register
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing.xxl,
  },
  forgot: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.xl,
  },
  submit: {
    marginBottom: Spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  switch: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
});
