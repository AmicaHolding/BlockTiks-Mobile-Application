import { Button, IconButton, Screen, Text, useToast } from '@/components/ui';
import { ApiConstants } from '@/constants/Api';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { haptic } from '@/services/haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputKeyPressEventData, TouchableOpacity, View } from 'react-native';

const OTP_LENGTH = ApiConstants.otpLength;
const RESEND_COOLDOWN = 30;

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<TextInput[]>([]);
  const { show } = useToast();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (text: string, index: number) => {
    const updated = [...otp];
    updated[index] = text.slice(-1);
    setOtp(updated);
    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (text && index === OTP_LENGTH - 1) {
      const code = [...updated.slice(0, -1), text.slice(-1)].join('');
      if (code.length === OTP_LENGTH) {
        handleSubmit(code);
      }
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (codeOverride?: string) => {
    const code = codeOverride ?? otp.join('');
    if (code.length !== OTP_LENGTH) {
      show('Please enter the full code', 'error');
      return;
    }
    setLoading(true);
    // TODO(backend): call verify-otp endpoint; mock accepts any code in dev.
    setTimeout(() => {
      setLoading(false);
      haptic.success();
      show('Code verified', 'success');
      router.push('/(auth)/reset-password');
    }, 800);
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    haptic.light();
    setCooldown(RESEND_COOLDOWN);
    show('Code resent', 'success');
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <IconButton name="chevron-back" onPress={() => router.back()} style={styles.back} />
      <Text variant="heading1" weight="bold" style={styles.title}>
        Enter verification code
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        We sent a {OTP_LENGTH}-digit code to your email.
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
            style={[styles.otpInput, digit ? styles.otpInputFilled : undefined]}
            selectionColor={Colors.primary}
          />
        ))}
      </View>

      <Button title="Verify" loading={loading} onPress={() => handleSubmit()} style={styles.submit} />

      <TouchableOpacity onPress={handleResend} disabled={cooldown > 0} style={styles.resend}>
        <Text variant="bodySmall" color={Colors.textMuted} center>
          Didn't receive it?{' '}
          <Text
            variant="bodySmall"
            weight="semibold"
            color={cooldown > 0 ? Colors.textDim : Colors.primaryBright}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </Text>
        </Text>
      </TouchableOpacity>
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
    width: 52,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundElevated,
    color: Colors.text,
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
  },
  submit: {
    marginBottom: Spacing.lg,
  },
  resend: {
    marginTop: Spacing.md,
  },
});
