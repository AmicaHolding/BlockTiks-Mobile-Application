import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Card, PressableCard, IconButton, Button } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const STATS = [
  { label: 'Total Sales', value: '$12,450', icon: 'cash-outline' },
  { label: 'Tickets Sold', value: '348', icon: 'ticket-outline' },
  { label: 'Events Live', value: '6', icon: 'calendar-outline' },
  { label: 'Revenue', value: '$9,820', icon: 'trending-up-outline' },
];

const ACTIONS = [
  { label: 'Create Event', icon: 'add-circle-outline', route: '/(app)/events/create' },
  { label: 'Manage Teams', icon: 'people-outline', route: '/(app)/manage-teams' },
  { label: 'Venue Layout', icon: 'grid-outline', route: '/(app)/venue-layout' },
  { label: 'Promo Codes', icon: 'pricetag-outline', route: '/(app)/promo-codes' },
];

export default function CreatorDashboardScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => router.back()} />
        <Text variant="heading2" weight="bold">
          Creator Dashboard
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsGrid}>
        {STATS.map((stat) => (
          <Card key={stat.label} style={styles.statCard}>
            <Ionicons name={stat.icon as any} size={24} color={Colors.primary} />
            <Text variant="heading2" weight="bold" style={styles.statValue}>
              {stat.value}
            </Text>
            <Text variant="bodySmall" color={Colors.textMuted}>
              {stat.label}
            </Text>
          </Card>
        ))}
      </View>

      <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
        Quick Actions
      </Text>
      <View style={styles.actionsGrid}>
        {ACTIONS.map((action) => (
          <PressableCard
            key={action.label}
            style={styles.actionCard}
            onPress={() => router.push(action.route as any)}
          >
            <Ionicons name={action.icon as any} size={28} color={Colors.primary} />
            <Text variant="bodySmall" weight="medium" style={styles.actionLabel} center>
              {action.label}
            </Text>
          </PressableCard>
        ))}
      </View>

      <Button
        title="Create New Event"
        onPress={() => router.push('/(app)/events/create')}
        style={styles.createButton}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 24,
  },
  actionLabel: {
    marginTop: 8,
  },
  createButton: {
    marginTop: 'auto',
    marginBottom: 8,
  },
});
