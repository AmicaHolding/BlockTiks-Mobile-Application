import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, IconButton, useToast } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS } from '@/services/data';

const TIERS = [
  { id: 'ga', name: 'General Admission', description: 'Standing room, main floor access', price: 85, remaining: 120 },
  { id: 'vip', name: 'VIP', description: 'Priority entry + balcony access', price: 150, remaining: 24 },
  { id: 'backstage', name: 'Backstage Pass', description: 'Meet & greet + after-party', price: 295, remaining: 6 },
];

export default function TicketSelectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = EVENTS.find((e) => e.id === id) || EVENTS[0];
  const { show } = useToast();

  const [selectedTier, setSelectedTier] = useState(TIERS[0].id);
  const [quantity, setQuantity] = useState(1);

  const tier = TIERS.find((t) => t.id === selectedTier) || TIERS[0];
  const total = tier.price * quantity;
  const fees = Math.round(total * 0.12);
  const finalTotal = total + fees;

  const handleContinue = () => {
    if (!selectedTier) {
      show('Select a ticket type', 'error');
      return;
    }
    router.push(`/(app)/payment-page?eventId=${event.id}&tier=${selectedTier}&qty=${quantity}` as any);
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
        {TIERS.map((t) => {
          const active = selectedTier === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.9}
              onPress={() => setSelectedTier(t.id)}
              style={[styles.tierCard, active && styles.tierCardActive]}
            >
              <View style={styles.tierHeader}>
                <View>
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
                <Text variant="caption" color={Colors.textMuted}>
                  {t.remaining} left
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
            onPress={() => setQuantity((q) => Math.min(8, q + 1))}
            disabled={quantity >= 8}
          >
            <Ionicons name="add" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

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
    marginBottom: Spacing.xxl,
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
    backgroundColor: `${Colors.primary}10`,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.xxl,
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
