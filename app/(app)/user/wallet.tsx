import { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS, TRANSACTIONS } from '@/services/data';

const TABS = ['Tickets', 'Wallet'];

const MY_TICKETS = [
  { id: 't1', eventId: EVENTS[0].id, title: EVENTS[0].title, date: EVENTS[0].date, tier: 'General Admission', qty: 2 },
  { id: 't2', eventId: EVENTS[1].id, title: EVENTS[1].title, date: EVENTS[1].date, tier: 'VIP', qty: 1 },
];

export default function WalletScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Screen>
      <AppHeader title="Wallet" showNotification />

      <View style={styles.tabRow}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === idx && styles.tabActive]}
            onPress={() => setActiveTab(idx)}
          >
            <Text
              variant="body"
              weight={activeTab === idx ? 'bold' : 'medium'}
              color={activeTab === idx ? Colors.ink : Colors.text}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 0 ? (
        <FlatList
          data={MY_TICKETS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text variant="body" color={Colors.textMuted} center>
              No tickets yet.
            </Text>
          }
          renderItem={({ item }) => (
            <PressableCard
              variant="pressed"
              style={styles.ticketCard}
              onPress={() => router.push('/(app)/purchased-ticket')}
            >
              <Image source={{ uri: EVENTS.find((e) => e.id === item.eventId)?.image || EVENTS[0].image }} style={styles.ticketImage} />
              <View style={styles.ticketInfo}>
                <Text variant="heading3" weight="bold" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="bodySmall" color={Colors.textMuted}>
                  {item.date}
                </Text>
                <Text variant="caption" color={Colors.textMuted}>
                  {item.qty} × {item.tier}
                </Text>
              </View>
              <Ionicons name="qr-code-outline" size={28} color={Colors.text} />
            </PressableCard>
          )}
        />
      ) : (
        <>
          <View style={styles.balanceCard}>
            <Text variant="caption" color={Colors.textMuted}>
              Available balance
            </Text>
            <Text variant="display" weight="bold" style={styles.balanceAmount}>
              $2,000.00
            </Text>
            <View style={styles.actionRow}>
              <Button
                title="Deposit"
                size="small"
                onPress={() => router.push('/(app)/withdraw')}
                style={styles.actionButton}
              />
              <Button
                title="Withdraw"
                variant="outline"
                size="small"
                onPress={() => router.push('/(app)/withdraw')}
                style={styles.actionButton}
              />
            </View>
          </View>

          <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
            Recent activity
          </Text>
          <FlatList
            data={TRANSACTIONS}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.transactionRow}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name={item.type === 'credit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                    size={18}
                    color={item.type === 'credit' ? Colors.success : Colors.error}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text variant="body" weight="medium">
                    {item.title}
                  </Text>
                  <Text variant="caption" color={Colors.textMuted}>
                    {item.date}
                  </Text>
                </View>
                <Text
                  variant="body"
                  weight="bold"
                  color={item.type === 'credit' ? Colors.success : Colors.error}
                >
                  {item.type === 'credit' ? '+' : '-'}${Math.abs(item.amount)}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  ticketImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    marginRight: 14,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  balanceCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  balanceAmount: {
    marginTop: 8,
    marginBottom: Spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
});
