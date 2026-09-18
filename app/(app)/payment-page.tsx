import { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Screen,
  AppHeader,
  Button,
  Card,
  PressableCard,
  Input,
  useToast,
} from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: 'card-outline' },
  { id: 'wallet', label: 'Wallet Balance', icon: 'wallet-outline' },
  { id: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
] as const;

export default function PaymentPageScreen() {
  const [method, setMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Ticket purchased successfully!', 'success');
      router.replace('/(app)/purchased-ticket');
    }, 1500);
  };

  return (
    <Screen>
      <AppHeader title="Checkout" showBack />

      <Card style={styles.summaryCard}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80' }}
          style={styles.eventImage}
        />
        <View style={styles.summaryText}>
          <Text variant="heading3" weight="bold">
            DJ MaksMellow Orignawa
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted}>
            2 tickets · Platinum
          </Text>
        </View>
      </Card>

      <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
        Order Summary
      </Text>
      <Card style={styles.totalsCard}>
        <View style={styles.row}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Subtotal
          </Text>
          <Text variant="bodySmall">$810.00</Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Service Fee
          </Text>
          <Text variant="bodySmall">$12.50</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text variant="body" weight="bold">
            Total
          </Text>
          <Text variant="heading3" weight="bold" color={Colors.success}>
            $822.50
          </Text>
        </View>
      </Card>

      <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
        Payment Method
      </Text>
      {PAYMENT_METHODS.map((m) => (
        <PressableCard
          key={m.id}
          variant={method === m.id ? 'elevated' : 'pressed'}
          style={[styles.methodCard, method === m.id && styles.methodActive]}
          onPress={() => setMethod(m.id)}
        >
          <View style={styles.methodLeft}>
            <Ionicons name={m.icon as any} size={22} color={method === m.id ? Colors.primary : Colors.text} />
            <Text variant="bodySmall" weight="medium" style={styles.methodLabel}>
              {m.label}
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              method === m.id && { backgroundColor: Colors.primary, borderColor: Colors.primary },
            ]}
          />
        </PressableCard>
      ))}

      {method === 'card' && (
        <>
          <Input label="Cardholder Name" placeholder="John Doe" />
          <Input label="Card Number" placeholder="0000 0000 0000 0000" keyboardType="number-pad" />
          <View style={styles.cardRow}>
            <Input label="Expiry" placeholder="MM/YY" containerStyle={styles.flex} />
            <Input label="CVV" placeholder="123" keyboardType="number-pad" secure containerStyle={styles.flex} />
          </View>
        </>
      )}

      <View style={{ flex: 1 }} />
      <Button title={`Pay $822.50`} loading={loading} onPress={handlePay} style={styles.payButton} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    marginRight: Spacing.md,
  },
  summaryText: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  totalsCard: {
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
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 10,
  },
  methodActive: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodLabel: {
    marginLeft: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  payButton: {
    marginTop: Spacing.lg,
  },
});
