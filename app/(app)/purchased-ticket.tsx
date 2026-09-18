import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, Card } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

export default function PurchasedTicketScreen() {
  return (
    <Screen scrollable>
      <AppHeader title="My ticket" showBack />

      <Card style={styles.ticketCard}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80' }}
          style={styles.eventImage}
        />
        <View style={styles.ticketInfo}>
          <Text variant="heading2" weight="bold" style={styles.title}>
            DJ MaksMellow Orignawa
          </Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primaryBright} />
            <Text variant="bodySmall" color={Colors.textMuted} style={styles.detailText}>
              April 20, 2024 · 8:00 PM
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={Colors.primaryBright} />
            <Text variant="bodySmall" color={Colors.textMuted} style={styles.detailText}>
              Madison Square Garden
            </Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text variant="caption" color={Colors.textMuted}>
                Section
              </Text>
              <Text variant="body" weight="bold">
                GA
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text variant="caption" color={Colors.textMuted}>
                Quantity
              </Text>
              <Text variant="body" weight="bold">
                2
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.qrSection}>
        <View style={styles.qrBox}>
          <Ionicons name="qr-code" size={120} color={Colors.ink} />
        </View>
        <Text variant="caption" color={Colors.textMuted} center style={styles.qrHint}>
          Show this at the entrance. Screenshots won't work.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Transfer to a friend"
          variant="outline"
          onPress={() => router.push('/(app)/transfer')}
          style={styles.actionButton}
        />
        <Button
          title="Sell on marketplace"
          variant="outline"
          onPress={() => router.push('/(app)/place-bid')}
          style={styles.actionButton}
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
  },
  qrHint: {
    marginTop: Spacing.md,
    paddingHorizontal: 32,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },
});
