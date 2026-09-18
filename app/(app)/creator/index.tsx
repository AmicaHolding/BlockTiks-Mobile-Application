import { View, StyleSheet, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';
import { ANALYTICS, EVENTS } from '@/services/data';

const QUICK_ACTIONS = [
  { label: 'Create event', icon: 'add-circle-outline', route: '/(app)/events/create' },
  { label: 'Guests', icon: 'people-outline', route: '/(app)/all-guests' },
  { label: 'Scan tickets', icon: 'scan-outline', route: '/(app)/scanner' },
  { label: 'Promo codes', icon: 'pricetag-outline', route: '/(app)/promo-codes' },
];

export default function CreatorHomeScreen() {
  return (
    <Screen scrollable noPadding>
      <View style={styles.header}>
        <View>
          <Text variant="caption" color={Colors.textMuted}>
            Total revenue
          </Text>
          <Text variant="display" weight="bold" style={styles.revenue}>
            ${ANALYTICS.totalSales.toLocaleString()}
          </Text>
        </View>
        <PressableCard
          variant="pressed"
          style={styles.analyticsButton}
          onPress={() => router.push('/(app)/analytics')}
        >
          <Ionicons name="bar-chart-outline" size={22} color={Colors.text} />
        </PressableCard>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="heading2" weight="bold">{ANALYTICS.ticketsSold}</Text>
          <Text variant="bodySmall" color={Colors.textMuted}>Tickets sold</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading2" weight="bold">{ANALYTICS.eventsLive}</Text>
          <Text variant="bodySmall" color={Colors.textMuted}>Live events</Text>
        </View>
      </View>

      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <PressableCard
            key={action.label}
            variant="pressed"
            style={styles.actionCard}
            onPress={() => {
              haptic.light();
              router.push(action.route as any);
            }}
          >
            <Ionicons name={action.icon as any} size={26} color={Colors.primaryBright} />
            <Text variant="caption" weight="medium" center style={styles.actionLabel}>
              {action.label}
            </Text>
          </PressableCard>
        ))}
      </View>

      <View style={styles.sectionPadding}>
        <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
          Your events
        </Text>
        <FlatList
          data={EVENTS.slice(0, 4)}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.eventsList}
          renderItem={({ item }) => (
            <PressableCard
              variant="pressed"
              style={styles.eventRow}
              onPress={() => router.push('/(app)/creator-event')}
            >
              <Image source={{ uri: item.image }} style={styles.eventThumb} />
              <View style={styles.eventInfo}>
                <Text variant="body" weight="medium" numberOfLines={1}>{item.title}</Text>
                <Text variant="caption" color={Colors.textMuted}>{item.date}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </PressableCard>
          )}
        />

        <Button
          title="Create new event"
          onPress={() => {
            haptic.medium();
            router.push('/(app)/events/create');
          }}
          style={styles.createButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.lg,
  },
  revenue: {
    marginTop: 8,
    fontSize: 44,
    lineHeight: 50,
  },
  analyticsButton: {
    padding: 10,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  stat: {
    alignItems: 'flex-start',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.xxl,
  },
  actionCard: {
    width: '23.3%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  actionLabel: {
    marginTop: 8,
  },
  sectionPadding: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  eventsList: {
    gap: 10,
    marginBottom: Spacing.xl,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  eventThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
    marginRight: 8,
  },
  createButton: {
    marginTop: Spacing.md,
  },
});
