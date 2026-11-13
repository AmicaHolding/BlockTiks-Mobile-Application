import { AppHeader, Button, EmptyState, PressableCard, Screen, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { MY_TICKETS, TRANSACTIONS } from '@/services/data';
import { haptic } from '@/services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const TABS = ['Tickets', 'Balance'];

const WALLET_BALANCE = 84.5;

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
            onPress={() => {
              haptic.light();
              setActiveTab(idx);
            }}
          >
            <Text
              variant="body"
              weight={activeTab === idx ? 'semibold' : 'medium'}
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
            <EmptyState
              icon="qr-code-outline"
              title="No tickets yet"
              subtitle="Tickets you buy will show up here with a QR code for the door."
              actionTitle="Discover events"
              onAction={() => router.push('/(app)/user')}
            />
          }
          renderItem={({ item }) => (
            <PressableCard
              variant="pressed"
              style={styles.ticketCard}
              onPress={() =>
                router.push({
                  pathname: '/(app)/purchased-ticket',
                  params: { eventId: item.eventId },
                } as any)
              }
            >
              <Image source={{ uri: item.image }} style={styles.ticketImage} />
              <View style={styles.ticketInfo}>
                <Text variant="heading3" weight="bold" numberOfLines={2}>
                  {item.eventTitle}
                </Text>
                <Text variant="bodySmall" color={Colors.textMuted}>
                  {item.date}
                </Text>
                <Text variant="caption" color={Colors.textMuted}>
                  {item.type}
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
            <Text variant="heading1" weight="bold" style={styles.balanceAmount}>
              ${WALLET_BALANCE.toFixed(2)}
            </Text>
            <Text variant="caption" color={Colors.textMuted} style={styles.balanceHint}>
              Balance is added automatically when your ticket listings sell.
            </Text>
            <View style={styles.actionRow}>
              <Button
                title="Withdraw"
                variant="outline"
                size="small"
                onPress={() => {
                  haptic.medium();
                  router.push('/(app)/withdraw');
                }}
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
    marginBottom: 6,
  },
  balanceHint: {
    marginBottom: Spacing.lg,
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
