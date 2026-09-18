import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, Card } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

export default function PurchasedTicketScreen() {
  return (
    <Screen scrollable>
      <AppHeader title="My Ticket" showBack />

      <Card style={styles.ticketCard}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80' }}
          style={styles.eventImage}
        />
        <View style={styles.ticketInfo}>
          <Text variant="heading3" weight="bold">
            DJ MaksMellow Orignawa
          </Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Text variant="bodySmall" color={Colors.textMuted} style={styles.detailText}>
              April 20, 2024 · 8:00 PM
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={Colors.primary} />
            <Text variant="bodySmall" color={Colors.textMuted} style={styles.detailText}>
              Madison Square Garden
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.ticketMeta}>
            <View>
              <Text variant="caption" color={Colors.textMuted}>
                Ticket Type
              </Text>
              <Text variant="bodySmall" weight="bold">
                Platinum
              </Text>
            </View>
            <View>
              <Text variant="caption" color={Colors.textMuted}>
                Seat
              </Text>
              <Text variant="bodySmall" weight="bold">
                A-12
              </Text>
            </View>
            <View>
              <Text variant="caption" color={Colors.textMuted}>
                Gate
              </Text>
              <Text variant="bodySmall" weight="bold">
                4
              </Text>
            </View>
          </View>
          <View style={styles.qrWrapper}>
            <View style={styles.qrBox}>
              <Ionicons name="qr-code" size={80} color={Colors.text} />
              <Text variant="caption" color={Colors.textMuted} style={styles.qrText}>
                BT-TICKET-PLT-001
              </Text>
            </View>
          </View>
          <Text variant="caption" color={Colors.textMuted} center>
            Show this QR code at the entrance
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Transfer"
          variant="outline"
          onPress={() => router.push('/(app)/transfer')}
          style={styles.actionButton}
        />
        <Button
          title="Resell"
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  detailText: {
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: Spacing.lg,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qrWrapper: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  qrBox: {
    width: 180,
    height: 180,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    marginTop: 8,
    color: Colors.black,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
