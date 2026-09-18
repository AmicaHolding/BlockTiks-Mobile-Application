import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, AppHeader, Input, Button, useToast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

export default function TransferScreen() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleTransfer = () => {
    if (!recipient || !amount) {
      show('Please enter recipient and amount', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Transfer successful', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Transfer" showBack />

      <Input
        label="Recipient Email / Username"
        placeholder="Enter recipient"
        value={recipient}
        onChangeText={setRecipient}
      />
      <Input
        label="Amount"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Input
        label="Message (optional)"
        placeholder="Add a message"
        multiline
        numberOfLines={3}
        style={styles.noteInput}
      />

      <Button title="Send Funds" loading={loading} onPress={handleTransfer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
