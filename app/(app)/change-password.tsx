import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Input, Button, useToast } from '@/components/ui';
import { Colors } from '@/constants/Colors';

export default function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleSubmit = () => {
    if (!current || !newPassword || !confirm) {
      show('Please fill in all fields', 'error');
      return;
    }
    if (newPassword !== confirm) {
      show('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Password updated', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Change Password" showBack />

      <Input
        label="Current Password"
        placeholder="Enter current password"
        secure
        value={current}
        onChangeText={setCurrent}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
      />
      <Input
        label="New Password"
        placeholder="Enter new password"
        secure
        value={newPassword}
        onChangeText={setNewPassword}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
      />
      <Input
        label="Confirm New Password"
        placeholder="Confirm new password"
        secure
        value={confirm}
        onChangeText={setConfirm}
        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} />}
      />

      <Button title="Update Password" loading={loading} onPress={handleSubmit} />
    </Screen>
  );
}
