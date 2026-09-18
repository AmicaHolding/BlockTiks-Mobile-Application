import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors, Radius, Spacing } from '@/constants/Colors';

interface Props {
  title: string;
  price: number;
  count: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
  max?: number;
}

export function TicketCounter({
  title,
  price,
  count,
  color,
  onIncrement,
  onDecrement,
  max = 10,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.priceTag, { backgroundColor: color }]}>
        <Text variant="bodySmall" weight="bold" color={Colors.black}>
          ${price}
        </Text>
      </View>
      <View style={styles.controlContainer}>
        <Text variant="bodySmall" weight="bold" style={styles.title}>
          {title}
        </Text>
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={onDecrement}
            disabled={count === 0}
            style={[styles.button, count === 0 && styles.buttonDisabled]}
          >
            <Text variant="heading2" weight="bold" style={styles.buttonText}>
              -
            </Text>
          </TouchableOpacity>
          <Text variant="body" weight="bold" style={styles.count}>
            {count}
          </Text>
          <TouchableOpacity
            onPress={onIncrement}
            disabled={count >= max}
            style={[styles.button, count >= max && styles.buttonDisabled]}
          >
            <Text variant="heading2" weight="bold" style={styles.buttonText}>
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  priceTag: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.md,
    marginLeft: Spacing.md,
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  title: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    lineHeight: 24,
  },
  count: {
    minWidth: 36,
    textAlign: 'center',
  },
});
