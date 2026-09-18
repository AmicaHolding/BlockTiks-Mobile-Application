import { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, PressableCard, Input, useToast } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS } from '@/services/data';

const TIERS: Record<string, { name: string; price: number }> = {
  ga: { name: 'General Admission', price: 85 },
  vip: { name: 'VIP', price: 150 },
  backstage: { name: 'Backstage Pass', price: 295 },
};

const PAYMENT_METHODS = [
  { id: 'apple', label: 'Apple Pay', icon: 'logo-apple' },
  { id: 'card', label: 'Credit or debit card', icon: 'card-outline' },
  { id: 'wallet', label: 'BlockTiks Wallet', icon: 'wallet-outline' },
] as const;

export default function PaymentPageScreen() {
  const { eventId = EVENTS[0].id, tier = 'ga', qty = '1' } = useLocalSearchParams();
  const event = EVENTS.find((e) => e.id === eventId) || EVENTS[0];
  const tierInfo = TIERS[tier as string] || TIERS.ga;
  const quantity = parseInt(qty as string, 10) || 1;

  const [method, setMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const ticketsTotal = tierInfo.price * quantity;
  const fees = Math.round(ticketsTotal * 0.12);
  const orderTotal = ticketsTotal + fees;

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Tickets secured!', 'success');
      router.replace('/(app)/purchased-ticket');
    }, 1500);
  };

  return (
    <Screen scrollable>
      <AppHeader title="Checkout" showBack />

      <View style={styles.eventSummary}>
        <Image source={{ uri: event.image }} style={styles.eventImage} />
        <View style={styles.eventInfo}>
          <Text variant="heading3" weight="bold" numberOfLines={2}>
            {event.title}
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted}>
            {event.date}
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted}>
            {quantity} × {tierInfo.name}
          </Text>
        </View>
      </View>

      <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
        Pay with
      </Text>
      {PAYMENT_METHODS.map((m) => (
        <PressableCard
          key={m.id}
          variant={method === m.id ? 'elevated' : 'pressed'}
          style={[styles.methodCard, method === m.id && styles.methodActive]}
          onPress={() => setMethod(m.id)}
        >
          <View style={styles.methodLeft}>
            <Ionicons name={m.icon as any} size={22} color={method === m.id ? Colors.primaryBright : Colors.text} />
            <Text variant="body" weight="medium" style={styles.methodLabel}>
              {m.label}
            </Text>
          </View>
          <View
            style={[styles.radio, method === m.id && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
          />
        </PressableCard>
      ))}

      {method === 'card' && (
        <View style={styles.cardForm}>
          <Input label="Name on card" placeholder="John Doe" />
          <Input label="Card number" placeholder="0000 0000 0000 0000" keyboardType="number-pad" />
          <View style={styles.cardRow}>
            <Input label="Expiry" placeholder="MM/YY" containerStyle={styles.flex} />
            <Input label="CVC" placeholder="123" keyboardType="number-pad" containerStyle={styles.flex} />
          </View>
        </View>
      )}

      <View style={styles.totalsCard}>
        <View style={styles.row}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Tickets
          </Text>
          <Text variant="bodySmall">${ticketsTotal}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Fees
          </Text>
          <Text variant="bodySmall">${fees}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text variant="body" weight="bold">
            Total
          </Text>
          <Text variant="heading2" weight="bold">
            ${orderTotal}
          </Text>
        </View>
      </View>

      <Button title={`Pay $${orderTotal}`} loading={loading} onPress={handlePay} />

      <Text variant="caption" color={Colors.textMuted} center style={styles.disclaimer}>
        Payment processed securely. No card data is stored on this device.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventSummary: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  eventImage: {
    width: 88,
    height: 88,
    borderRadius: Radius.md,
    marginRight: Spacing.md,
  },
  eventInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 16,
  },
  methodActive: {
    borderColor: Colors.primary,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodLabel: {
    marginLeft: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
  },
  cardForm: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  totalsCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  disclaimer: {
    marginTop: Spacing.lg,
  },
});
