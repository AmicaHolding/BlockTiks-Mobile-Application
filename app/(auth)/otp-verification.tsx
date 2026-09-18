import { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, Button, Screen, IconButton, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { ApiConstants } from '@/constants/Api';

export default function OtpVerificationScreen() {
  const { email, from } = useLocalSearchParams<{ email?: string; from?: 'forgot' | 'signup' }>();
  const [code, setCode] = useState<string[]>(new Array(ApiConstants.otpLength).fill(''));
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < ApiConstants.otpLength - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const otp = code.join('');
    if (otp.length !== ApiConstants.otpLength) {
      show('Please enter the full code', 'error');
      return;
    }

    setLoading(true);
    try {
      // Verify OTP via API when ready
      show('OTP verified', 'success');
      if (from === 'forgot') {
        router.push({ pathname: '/(auth)/reset-password', params: { email } });
      } else {
        router.replace('/(app)');
      }
    } catch {
      show('Invalid OTP', 'error');
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
        Verify OTP
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        Enter the 6-digit code sent to {email || 'your email'}.
      </Text>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) inputs.current[index] = ref;
            }}
            style={styles.codeInput}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            selectionColor={Colors.primary}
          />
        ))}
      </View>

      <Button title="Verify" loading={loading} onPress={handleSubmit} />

      <View style={styles.resend}>
        <Text variant="bodySmall" color={Colors.textMuted}>
          Didn't receive the code?
        </Text>
        <Button
          title="Resend"
          variant="ghost"
          size="small"
          fullWidth={false}
          onPress={() => show('OTP resent', 'info')}
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  resend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
});
