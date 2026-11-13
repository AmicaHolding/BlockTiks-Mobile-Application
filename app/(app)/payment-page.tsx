import { AppHeader, Button, Input, PressableCard, Screen, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { DEFAULT_TIERS, EVENTS } from '@/services/data';
import { haptic } from '@/services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const FEE_RATE = 0.12;

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit or debit card', icon: 'card-outline' },
  { id: 'wallet', label: 'BlockTiks balance', icon: 'wallet-outline' },
] as const;

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function PaymentPageScreen() {
  const { eventId = EVENTS[0].id, tier = '', qty = '1', promo = '' } = useLocalSearchParams();
  const event = EVENTS.find((e) => e.id === eventId) || EVENTS[0];
  const tiers = event.tiers?.length ? event.tiers : DEFAULT_TIERS;
  const tierInfo = tiers.find((t) => t.id === tier) || tiers[0];
  const quantity = Math.max(1, parseInt(qty as string, 10) || 1);

  const [method, setMethod] = useState<string>('card');
  const [loading, setLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState<string | null>(null);

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ticketsTotal = tierInfo.price * quantity;
  const promoCode = typeof promo === 'string' ? promo : promo?.[0] ?? '';
  const discount = promoApplied && promoApplied === promoCode ? Math.round(ticketsTotal * 0.1) : 0;
  const fees = Math.round((ticketsTotal - discount) * FEE_RATE);
  const orderTotal = ticketsTotal - discount + fees;

  const validateCard = () => {
    const next: Record<string, string> = {};
    if (method !== 'card') return next;
    if (!cardName.trim()) next.name = 'Name on card is required';
    if (cardNumber.replace(/\s/g, '').length < 15) next.number = 'Enter a valid card number';
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) next.expiry = 'Use MM/YY';
    if (cardCvc.length < 3) next.cvc = 'Enter CVC';
    return next;
  };

  const handlePay = () => {
    const nextErrors = validateCard();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      haptic.error();
      return;
    }
    haptic.medium();
    setLoading(true);
    // TODO(backend): replace with Stripe PaymentIntent confirmation once the
    // MVP API is live. For now this simulates a successful test checkout.
    setTimeout(() => {
      setLoading(false);
      haptic.success();
      router.replace({
        pathname: '/(app)/purchased-ticket',
        params: { eventId: event.id, tier: tierInfo.id, qty: String(quantity) },
      } as any);
    }, 1500);
  };

  return (
    <Screen scrollable>
      <AppHeader title="Checkout" showBack />

      <View style={styles.testBanner}>
        <Ionicons name="flask-outline" size={14} color={Colors.warning} />
        <Text variant="caption" color={Colors.warning} style={styles.testBannerText}>
          Test checkout — no real payment is processed yet
        </Text>
      </View>

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
          <Input
            label="Name on card"
            placeholder="John Doe"
            value={cardName}
            onChangeText={setCardName}
            error={errors.name}
          />
          <Input
            label="Card number"
            placeholder="0000 0000 0000 0000"
            keyboardType="number-pad"
            value={cardNumber}
            onChangeText={(v) => setCardNumber(formatCardNumber(v))}
            error={errors.number}
          />
          <View style={styles.cardRow}>
            <Input
              label="Expiry"
              placeholder="MM/YY"
              keyboardType="number-pad"
              value={cardExpiry}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 4);
                setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
              }}
              error={errors.expiry}
              containerStyle={styles.flex}
            />
            <Input
              label="CVC"
              placeholder="123"
              keyboardType="number-pad"
              value={cardCvc}
              onChangeText={(v) => setCardCvc(v.replace(/\D/g, '').slice(0, 4))}
              error={errors.cvc}
              containerStyle={styles.flex}
            />
          </View>
        </View>
      )}

      {promoCode ? (
        <View style={styles.promoRow}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Promo {promoCode}
          </Text>
          <TouchableOpacityText
            label={promoApplied ? 'Applied' : 'Apply'}
            onPress={() => {
              haptic.light();
              setPromoApplied(promoCode);
            }}
            disabled={!!promoApplied}
          />
        </View>
      ) : null}

      <View style={styles.totalsCard}>
        <View style={styles.row}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Tickets
          </Text>
          <Text variant="bodySmall">${ticketsTotal}</Text>
        </View>
        {discount > 0 && (
          <View style={styles.row}>
            <Text variant="bodySmall" color={Colors.success}>
              Promo discount
            </Text>
            <Text variant="bodySmall" color={Colors.success}>
              -${discount}
            </Text>
          </View>
        )}
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
        Tickets are delivered instantly to your wallet after payment.
      </Text>
    </Screen>
  );
}

function TouchableOpacityText({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text variant="bodySmall" weight="semibold" color={disabled ? Colors.textMuted : Colors.primaryBright}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  testBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,159,67,0.1)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Spacing.lg,
  },
  testBannerText: {
    flex: 1,
  },
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
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
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
