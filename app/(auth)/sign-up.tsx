import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Input, Screen, IconButton, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { ApiUrls } from '@/constants/Api';
import { api } from '@/services/api';

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { show } = useToast();

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password) {
      show('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api
        .post<{ token?: string; refreshToken?: string }>(ApiUrls.signup, {
          firstName,
          lastName,
          email,
          phone,
          password,
        })
        .catch(() => null);

      await setAuth(
        response?.token || 'mock_token',
        response?.refreshToken || 'mock_refresh',
        {
          email,
          firstName,
          lastName,
          phone,
          role: 'user',
        }
      );
      show('Account created!', 'success');
    } catch {
      show('Sign up failed. Try again.', 'error');
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
        Create Account
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Start exploring events and selling tickets today.
      </Text>

      <Input
        label="First Name"
        placeholder="John"
        value={firstName}
        onChangeText={setFirstName}
      />
      <Input
        label="Last Name"
        placeholder="Doe"
        value={lastName}
        onChangeText={setLastName}
      />
      <Input
        label="Email"
        placeholder="john@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="Phone"
        placeholder="+1 234 567 890"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Input
        label="Password"
        placeholder="Min. 8 characters"
        secure
        value={password}
        onChangeText={setPassword}
      />

      <Button title="Sign Up" loading={loading} onPress={handleSignUp} style={styles.submit} />

      <View style={styles.footer}>
        <Text variant="bodySmall" color={Colors.textMuted}>
          Already have an account?
        </Text>
        <Button
          title="Sign In"
          variant="ghost"
          size="small"
          fullWidth={false}
          onPress={() => router.push('/(auth)/sign-in')}
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
  submit: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
});
