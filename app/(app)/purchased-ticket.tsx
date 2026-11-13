import { AppHeader, Button, Card, Screen, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { EVENTS, MY_TICKETS } from '@/services/data';
import { haptic } from '@/services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import QRCode from 'react-qr-code';

export default function PurchasedTicketScreen() {
  const params = useLocalSearchParams<{ eventId?: string; tier?: string; qty?: string }>();

  const event = EVENTS.find((e) => e.id === params.eventId);
  const owned = MY_TICKETS.find((t) => t.eventId === params.eventId);

  const ticket = owned ?? {
    eventTitle: event?.title ?? 'Your event',
    date: event?.date ?? '',
    location: event?.location ?? '',
    image: event?.image ?? EVENTS[0].image,
    type: params.tier ?? 'General Admission',
    qrCode: `BT-${params.eventId ?? 'new'}-${params.tier ?? 'GA'}-${Date.now().toString(36).toUpperCase()}`,
  };

  const qty = params.qty ? parseInt(params.qty, 10) : 1;

  return (
    <Screen scrollable>
      <AppHeader title="My ticket" showBack onBackPress={() => router.replace('/(app)/user/wallet')} />

      <Card style={styles.ticketCard}>
        <Image source={{ uri: ticket.image }} style={styles.eventImage} />
        <View style={styles.ticketInfo}>
          <Text variant="heading2" weight="bold" style={styles.title}>
            {ticket.eventTitle}
          </Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primaryBright} />
            <Text variant="bodySmall" color={Colors.textMuted} style={styles.detailText}>
              {ticket.date}
              {event?.time ? ` · ${event.time}` : ''}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={Colors.primaryBright} />
            <Text variant="bodySmall" color={Colors.textMuted} style={styles.detailText}>
              {ticket.location}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text variant="caption" color={Colors.textMuted}>Type</Text>
              <Text variant="body" weight="bold">{ticket.type}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text variant="caption" color={Colors.textMuted}>Quantity</Text>
              <Text variant="body" weight="bold">{qty}</Text>
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.qrSection}>
        <View style={styles.qrBox}>
          <QRCode value={ticket.qrCode} size={180} bgColor={Colors.white} fgColor={Colors.ink} />
        </View>
        <Text variant="caption" color={Colors.textMuted} center style={styles.qrHint}>
          {ticket.qrCode}
        </Text>
        <Text variant="caption" color={Colors.textMuted} center>
          Show this at the entrance. Screenshots won't work.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Transfer to a friend"
          variant="outline"
          onPress={() => {
            haptic.medium();
            router.push('/(app)/transfer');
          }}
        />
        <Button
          title="Sell on marketplace"
          variant="outline"
          onPress={() => {
            haptic.medium();
            router.push('/(app)/ask-bid');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  ticketInfo: {
    padding: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: 48,
  },
  metaItem: {
    alignItems: 'flex-start',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  qrBox: {
    width: 220,
    height: 220,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrHint: {
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  actions: {
    gap: 12,
  },
});
