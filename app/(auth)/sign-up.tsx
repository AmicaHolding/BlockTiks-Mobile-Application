import { Button, IconButton, Input, Screen, Text, useToast } from '@/components/ui';
import { ApiUrls } from '@/constants/Api';
import { Colors, Spacing } from '@/constants/Colors';
import { api } from '@/services/api';
import { haptic } from '@/services/haptics';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const { setAuth } = useAuthStore();

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password) {
      show('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ token?: string; refreshToken?: string }>(
        ApiUrls.signup,
        { firstName, lastName, email, phone, password }
      );

      if (!response?.token) {
        throw new Error('No token in response');
      }

      await setAuth(response.token, response.refreshToken || '', {
        email,
        firstName,
        lastName,
        phone,
        role: 'user',
      });
      haptic.success();
      show('Account created!', 'success');
      router.replace('/(app)');
    } catch {
      if (__DEV__) {
        // Dev-only bypass so the UI can be previewed before the MVP backend is live.
        await setAuth('mock_token', 'mock_refresh', {
          email,
          firstName,
          lastName,
          phone,
          role: 'user',
        });
        haptic.success();
        show('Dev mode: signed in without backend', 'info');
        router.replace('/(app)');
      } else {
        haptic.error();
        show('Sign up failed. Check your details and try again.', 'error');
      }
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
        Create Account
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Start exploring events and selling tickets today.
      </Text>

      <View style={styles.row}>
        <Input
          label="First Name"
          placeholder="John"
          value={firstName}
          onChangeText={setFirstName}
          containerStyle={styles.flex}
        />
        <Input
          label="Last Name"
          placeholder="Doe"
          value={lastName}
          onChangeText={setLastName}
          containerStyle={styles.flex}
        />
      </View>

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
        label="Phone"
        placeholder="+1 234 567 890"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        leftIcon={<Ionicons name="call-outline" size={20} color={Colors.textMuted} />}
      />
      <Input
        label="Password"
        placeholder="Create a password"
        secure
        value={password}
        onChangeText={setPassword}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
      />

      <Button title="Create Account" loading={loading} onPress={handleSignUp} style={styles.submit} />

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
        onPress={() => show('Google sign-up coming soon', 'info')}
      />

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.switch}>
        <Text variant="body" color={Colors.textMuted}>
          Already have an account?{' '}
        </Text>
        <Text variant="body" weight="bold" color={Colors.primary}>
          Sign In
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  submit: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
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
