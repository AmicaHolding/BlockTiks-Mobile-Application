import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, AppHeader, Input, Button, Card, useToast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

export default function WithdrawScreen() {
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleWithdraw = () => {
    if (!amount || !account) {
      show('Please enter amount and account details', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Withdrawal request submitted', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Withdraw" showBack />

      <Card style={styles.balanceCard}>
        <Text variant="caption" color={Colors.textMuted}>
          Available Balance
        </Text>
        <Text variant="heading1" weight="bold" style={styles.balance}>
          $2,000.00
        </Text>
      </Card>

      <Input
        label="Amount"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Input
        label="Bank Account / Wallet Address"
        placeholder="Enter account or wallet address"
        value={account}
        onChangeText={setAccount}
      />
      <Input
        label="Note (optional)"
        placeholder="Add a note"
        multiline
        numberOfLines={3}
        style={styles.noteInput}
      />

      <Button title="Withdraw Funds" loading={loading} onPress={handleWithdraw} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: Spacing.xl,
  },
  balance: {
    marginTop: 8,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
