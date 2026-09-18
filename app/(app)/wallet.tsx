import { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Card, Button, PressableCard, IconButton } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const TRANSACTIONS = [
  { id: '1', title: 'Ticket Purchase', amount: -85, date: 'Oct 20, 2026' },
  { id: '2', title: 'Refund - NBA Game', amount: 120, date: 'Oct 18, 2026' },
  { id: '3', title: 'Wallet Deposit', amount: 200, date: 'Oct 15, 2026' },
  { id: '4', title: 'Ticket Resale', amount: 45, date: 'Oct 12, 2026' },
];

export default function WalletScreen() {
  const [balance] = useState(240.03);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => router.back()} />
        <Text variant="heading2" weight="bold">
          Wallet
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <Card variant="elevated" style={styles.balanceCard}>
        <Text variant="body" color={Colors.textMuted}>
          Total Balance
        </Text>
        <Text variant="heading1" weight="bold" style={styles.balance}>
          ${balance.toFixed(2)}
        </Text>
        <View style={styles.actions}>
          <Button title="Deposit" style={styles.actionButton} />
          <Button
            title="Withdraw"
            variant="outline"
            style={styles.actionButton}
            onPress={() => router.push('/(app)/withdraw')}
          />
        </View>
      </Card>

      <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
        Recent Transactions
      </Text>
      <FlatList
        data={TRANSACTIONS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableCard style={styles.transactionCard}>
            <View style={styles.transactionLeft}>
              <View style={styles.iconBox}>
                <Ionicons
                  name={item.amount > 0 ? 'arrow-down-outline' : 'arrow-up-outline'}
                  size={18}
                  color={item.amount > 0 ? Colors.success : Colors.error}
                />
              </View>
              <View>
                <Text variant="body" weight="medium">
                  {item.title}
                </Text>
                <Text variant="bodySmall" color={Colors.textMuted}>
                  {item.date}
                </Text>
              </View>
            </View>
            <Text
              variant="body"
              weight="bold"
              color={item.amount > 0 ? Colors.success : Colors.error}
            >
              {item.amount > 0 ? '+' : ''}${Math.abs(item.amount)}
            </Text>
          </PressableCard>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  balance: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 42,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
