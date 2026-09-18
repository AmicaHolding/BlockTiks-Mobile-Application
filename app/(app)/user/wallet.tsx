import { View, StyleSheet, Image, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Screen,
  AppHeader,
  SearchField,
  Button,
  PressableCard,
  SectionHeader,
} from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS, TRANSACTIONS } from '@/services/data';

export default function WalletScreen() {
  return (
    <Screen>
      <AppHeader title="Wallet" showNotification />
      <SearchField
        readOnly
        onPress={() => router.push('/(app)/search')}
        containerStyle={styles.search}
      />

      <View style={styles.balanceRow}>
        <View>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Balance
          </Text>
          <View style={styles.balanceValue}>
            <Text variant="heading1" weight="bold">
              $2,000
            </Text>
            <Text variant="body" weight="medium" color={Colors.textMuted} style={styles.currency}>
              USD
            </Text>
            <Ionicons name="caret-down-outline" size={18} color={Colors.text} />
          </View>
          <View style={styles.growthRow}>
            <Text variant="bodySmall" color={Colors.textMuted}>
              This week
            </Text>
            <Text variant="bodySmall" weight="bold" color={Colors.success}>
              +10%
            </Text>
          </View>
        </View>
        <PressableCard style={styles.analyticsButton} onPress={() => router.push('/(app)/analytics')}>
          <Ionicons name="trending-up-outline" size={22} color={Colors.primary} />
        </PressableCard>
      </View>

      <View style={styles.actionRow}>
        <Button
          title="Deposit"
          onPress={() => router.push('/(app)/withdraw')}
          style={styles.actionButton}
        />
        <Button
          title="Withdraw"
          variant="outline"
          onPress={() => router.push('/(app)/withdraw')}
          style={styles.actionButton}
        />
        <Button
          title="Transfer"
          variant="outline"
          onPress={() => router.push('/(app)/transfer')}
          style={styles.actionButton}
        />
      </View>

      <SectionHeader title="Upcoming Events" />
      <PressableCard
        style={styles.featuredEvent}
        onPress={() => router.push('/(app)/upcoming-event')}
      >
        <Image source={{ uri: EVENTS[0].image }} style={styles.featuredImage} />
        <View style={styles.featuredInfo}>
          <Text variant="bodySmall" weight="bold">
            {EVENTS[0].title}
          </Text>
          <Text variant="caption" color={Colors.textMuted}>
            {EVENTS[0].category}
          </Text>
        </View>
      </PressableCard>

      <SectionHeader title="My Tickets" actionLabel="See All" onAction={() => router.push('/(app)/purchased-ticket')} />
      <PressableCard style={styles.ticketCard} onPress={() => router.push('/(app)/purchased-ticket')}>
        <Image source={{ uri: EVENTS[0].image }} style={styles.ticketImage} />
        <View style={styles.ticketInfo}>
          <Text variant="bodySmall" weight="bold">
            DJ MaksMellow Orignawa
          </Text>
          <Text variant="caption" color={Colors.textMuted}>
            Platinum · Apr 20, 2024
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </PressableCard>

      <SectionHeader title="Recent Transactions" />
      <FlatList
        data={TRANSACTIONS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.transactionsList}
        renderItem={({ item }) => (
          <View style={styles.transactionRow}>
            <View style={styles.transactionIconBox}>
              <Ionicons
                name={item.type === 'credit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={18}
                color={item.type === 'credit' ? Colors.success : Colors.error}
              />
            </View>
            <View style={styles.transactionInfo}>
              <Text variant="bodySmall" weight="medium">
                {item.title}
              </Text>
              <Text variant="caption" color={Colors.textMuted}>
                {item.date}
              </Text>
            </View>
            <Text
              variant="bodySmall"
              weight="bold"
              color={item.type === 'credit' ? Colors.success : Colors.error}
            >
              {item.type === 'credit' ? '+' : ''}${Math.abs(item.amount)}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: Spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  balanceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  currency: {
    marginLeft: 8,
    marginRight: 2,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  analyticsButton: {
    padding: 10,
    borderRadius: Radius.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
  featuredEvent: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  featuredImage: {
    width: '100%',
    height: 160,
  },
  featuredInfo: {
    padding: Spacing.md,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  ticketImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
  },
  ticketInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionsList: {
    gap: 10,
    paddingBottom: 24,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
});
