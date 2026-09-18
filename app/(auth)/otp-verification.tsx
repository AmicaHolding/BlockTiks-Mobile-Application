import { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, Button, useToast, IconButton } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

const OTP_LENGTH = 4;

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputs = useRef<TextInput[]>([]);
  const { show } = useToast();

  const handleChange = (text: string, index: number) => {
    const updated = [...otp];
    updated[index] = text.slice(-1);
    setOtp(updated);
    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      show('Please enter the full OTP', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('OTP verified', 'success');
      router.push('/(auth)/reset-password');
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <IconButton name="chevron-back" onPress={() => router.back()} style={styles.back} />
      <Text variant="heading1" weight="bold" style={styles.title}>
        OTP Verification
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        We sent a 4-digit code to your email. Enter it below.
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={(ref) => {
              if (ref) inputs.current[idx] = ref;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, idx)}
            onKeyPress={(e) => handleKeyPress(e, idx)}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.otpInput}
            selectionColor={Colors.primary}
          />
        ))}
      </View>

      <Button title="Verify" loading={loading} onPress={handleSubmit} style={styles.submit} />

      <Text variant="bodySmall" color={Colors.textMuted} center style={styles.resend}>
        Didn't receive it?{' '}
        <Text variant="bodySmall" weight="bold" color={Colors.primary}>
          Resend
        </Text>
      </Text>
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  otpInput: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: Colors.text,
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  submit: {
    marginBottom: Spacing.lg,
  },
  resend: {
    marginTop: Spacing.md,
  },
});
