import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, PressableCard, Button, Input } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

const METHODS = [
  { id: 'card', label: 'Visa ending in 4242', icon: 'card-outline' },
  { id: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
  { id: 'wallet', label: 'Wallet Balance', icon: 'wallet-outline' },
] as const;

export default function PaymentOptionsScreen() {
  const [selected, setSelected] = useState('card');
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Screen scrollable>
      <AppHeader title="Payment Options" showBack />

      {METHODS.map((m) => (
        <PressableCard
          key={m.id}
          variant={selected === m.id ? 'elevated' : 'pressed'}
          style={[styles.method, selected === m.id && styles.methodActive]}
          onPress={() => setSelected(m.id)}
        >
          <View style={styles.rowLeft}>
            <Ionicons name={m.icon as any} size={24} color={selected === m.id ? Colors.primary : Colors.text} />
            <Text variant="bodySmall" weight="medium" style={styles.label}>
              {m.label}
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              selected === m.id && { backgroundColor: Colors.primary, borderColor: Colors.primary },
            ]}
          />
        </PressableCard>
      ))}

      {showAdd && (
        <>
          <Input label="Card Number" placeholder="0000 0000 0000 0000" />
          <View style={styles.cardRow}>
            <Input label="Expiry" placeholder="MM/YY" containerStyle={styles.flex} />
            <Input label="CVV" placeholder="123" containerStyle={styles.flex} />
          </View>
        </>
      )}

      <Button
        title={showAdd ? 'Save Card' : 'Add Payment Method'}
        variant="outline"
        onPress={() => setShowAdd((s) => !s)}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 14,
  },
  methodActive: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
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
  button: {
    marginTop: Spacing.lg,
  },
});
