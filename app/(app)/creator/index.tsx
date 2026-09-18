import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Screen,
  AppHeader,
  Card,
  PressableCard,
  Button,
  SectionHeader,
} from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { ANALYTICS } from '@/services/data';

const ACTIONS = [
  { label: 'Create Event', icon: 'add-circle-outline', route: '/(app)/events/create' },
  { label: 'Manage Teams', icon: 'people-outline', route: '/(app)/manage-teams' },
  { label: 'Venue Layout', icon: 'grid-outline', route: '/(app)/venue-layout' },
  { label: 'Promo Codes', icon: 'pricetag-outline', route: '/(app)/promo-codes' },
  { label: 'Guests', icon: 'list-outline', route: '/(app)/all-guests' },
  { label: 'Broadcast', icon: 'megaphone-outline', route: '/(app)/broadcast-message' },
];

export default function CreatorHomeScreen() {
  return (
    <Screen>
      <AppHeader title="Creator Home" showNotification />

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Total Sales
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            ${ANALYTICS.totalSales.toLocaleString()}
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Tickets Sold
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            {ANALYTICS.ticketsSold}
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Events Live
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            {ANALYTICS.eventsLive}
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>
            Revenue
          </Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>
            ${ANALYTICS.revenue.toLocaleString()}
          </Text>
        </Card>
      </View>

      <SectionHeader title="Quick Actions" />
      <View style={styles.actionsGrid}>
        {ACTIONS.map((action) => (
          <PressableCard
            key={action.label}
            style={styles.actionCard}
            onPress={() => router.push(action.route as any)}
          >
            <Ionicons name={action.icon as any} size={28} color={Colors.primary} />
            <Text variant="caption" weight="medium" center style={styles.actionLabel}>
              {action.label}
            </Text>
          </PressableCard>
        ))}
      </View>

      <Button title="Create New Event" onPress={() => router.push('/(app)/events/create')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  actionCard: {
    width: '30.5%',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  actionLabel: {
    marginTop: 8,
  },
});
