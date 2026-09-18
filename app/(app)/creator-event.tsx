import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';
import { EVENTS, ANALYTICS } from '@/services/data';

const event = EVENTS[0];

const ACTIONS = [
  { label: 'Edit event', icon: 'create-outline', route: '/(app)/events/create' },
  { label: 'Guests', icon: 'people-outline', route: '/(app)/all-guests' },
  { label: 'Broadcast', icon: 'megaphone-outline', route: '/(app)/broadcast-message' },
  { label: 'Analytics', icon: 'bar-chart-outline', route: '/(app)/analytics' },
  { label: 'Settings', icon: 'settings-outline', route: '/(app)/event-settings' },
  { label: 'Ticket drops', icon: 'ticket-outline', route: '/(app)/event-tickets-drop' },
];

export default function CreatorEventScreen() {
  return (
    <Screen scrollable>
      <AppHeader title="Manage event" showBack />

      <Image source={{ uri: event.image }} style={styles.image} />
      <Text variant="heading1" weight="bold" style={styles.title}>
        {event.title}
      </Text>
      <Text variant="body" color={Colors.textMuted} style={styles.subtitle}>
        {event.date} · {ANALYTICS.ticketsSold} tickets sold · ${ANALYTICS.revenue.toLocaleString()} revenue
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>Tickets sold</Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>{ANALYTICS.ticketsSold}</Text>
        </View>
        <View style={styles.statCard}>
          <Text variant="caption" color={Colors.textMuted}>Revenue</Text>
          <Text variant="heading2" weight="bold" style={styles.statValue}>${(ANALYTICS.revenue / 1000).toFixed(1)}k</Text>
        </View>
      </View>

      <Text variant="heading3" weight="bold" style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.actionsGrid}>
        {ACTIONS.map((action) => (
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
            <Text variant="caption" weight="medium" center style={styles.actionLabel}>{action.label}</Text>
          </PressableCard>
        ))}
      </View>

      <Button
        title="Check in guests"
        onPress={() => {
          haptic.medium();
          router.push('/(app)/scanner');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  statValue: {
    marginTop: 6,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  actionCard: {
    width: '31.2%',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 6,
  },
  actionLabel: {
    marginTop: 8,
  },
});
