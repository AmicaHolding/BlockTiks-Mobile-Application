import { AppHeader, Button, Input, Screen, Text, useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { DEFAULT_TIERS, EVENTS } from '@/services/data';
import { haptic } from '@/services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const FEE_RATE = 0.12;

export default function TicketSelectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = EVENTS.find((e) => e.id === id) || EVENTS[0];
  const tiers = event.tiers?.length ? event.tiers : DEFAULT_TIERS;
  const { show } = useToast();

  const [selectedTier, setSelectedTier] = useState(tiers[0].id);
  const [quantity, setQuantity] = useState(1);
  const [promo, setPromo] = useState('');

  const tier = tiers.find((t) => t.id === selectedTier) || tiers[0];
  const total = tier.price * quantity;
  const fees = Math.round(total * FEE_RATE);
  const finalTotal = total + fees;

  const handleContinue = () => {
    if (!selectedTier) {
      show('Select a ticket type', 'error');
      return;
    }
    haptic.medium();
    const params = `eventId=${event.id}&tier=${selectedTier}&qty=${quantity}${promo ? `&promo=${encodeURIComponent(promo)}` : ''}`;
    router.push(`/(app)/payment-page?${params}` as any);
  };

  return (
    <Screen scrollable>
      <AppHeader title="Select tickets" showBack />

      <Text variant="heading2" weight="bold" style={styles.eventName}>
        {event.title}
      </Text>
      <Text variant="bodySmall" color={Colors.textMuted} style={styles.eventMeta}>
        {event.date} · {event.location}
      </Text>

      <View style={styles.tiers}>
        {tiers.map((t) => {
          const active = selectedTier === t.id;
          const soldOut = t.remaining <= 0;
          return (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.9}
              disabled={soldOut}
              onPress={() => {
                haptic.light();
                setSelectedTier(t.id);
              }}
              style={[styles.tierCard, active && styles.tierCardActive, soldOut && styles.tierCardSoldOut]}
            >
              <View style={styles.tierHeader}>
                <View style={styles.tierTitleWrap}>
                  <Text variant="heading3" weight="bold">
                    {t.name}
                  </Text>
                  <Text variant="bodySmall" color={Colors.textMuted}>
                    {t.description}
                  </Text>
                </View>
                <View
                  style={[styles.radio, active && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                />
              </View>
              <View style={styles.tierFooter}>
                <Text variant="caption" color={soldOut ? Colors.error : Colors.textMuted}>
                  {soldOut ? 'Sold out' : `${t.remaining} left`}
                </Text>
                <Text variant="heading3" weight="bold" color={active ? Colors.primaryBright : Colors.text}>
                  ${t.price}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.quantitySection}>
        <Text variant="heading3" weight="bold">
          Quantity
        </Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity === 1}
          >
            <Ionicons name="remove" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text variant="heading2" weight="bold" style={styles.qtyValue}>
            {quantity}
          </Text>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => setQuantity((q) => Math.min(Math.min(8, tier.remaining), q + 1))}
            disabled={quantity >= Math.min(8, tier.remaining)}
          >
            <Ionicons name="add" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <Input
        label="Promo code (optional)"
        placeholder="Enter code"
        value={promo}
        onChangeText={setPromo}
        autoCapitalize="characters"
        containerStyle={styles.promoInput}
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Tickets
          </Text>
          <Text variant="bodySmall" weight="medium">
            ${total}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Fees
          </Text>
          <Text variant="bodySmall" weight="medium">
            ${fees}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text variant="body" weight="bold">
            Total
          </Text>
          <Text variant="heading2" weight="bold">
            ${finalTotal}
          </Text>
        </View>
      </View>

      <Button title={`Pay $${finalTotal}`} onPress={handleContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventName: {
    marginBottom: 4,
  },
  eventMeta: {
    marginBottom: Spacing.xl,
  },
  tiers: {
    gap: 12,
    marginBottom: Spacing.xl,
  },
  tierCard: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundElevated,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tierCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(124,92,255,0.08)',
  },
  tierCardSoldOut: {
    opacity: 0.45,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tierTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    marginLeft: 12,
  },
  tierFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 32,
    textAlign: 'center',
  },
  promoInput: {
    marginBottom: Spacing.xl,
  },
  summary: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
