import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Screen, AppHeader, PressableCard } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';
import { TRANSACTIONS } from '@/services/data';
import { Ionicons } from '@expo/vector-icons';

export default function TransactionsScreen() {
  return (
    <Screen>
      <AppHeader title="Transactions" showBack />

      <FlatList
        data={TRANSACTIONS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableCard variant="pressed" style={styles.row}>
            <View style={styles.iconBox}>
              <Ionicons
                name={item.type === 'credit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                size={20}
                color={item.type === 'credit' ? Colors.success : Colors.error}
              />
            </View>
            <View style={styles.info}>
              <Text variant="bodySmall" weight="bold">
                {item.title}
              </Text>
              <Text variant="caption" color={Colors.textMuted}>
                {item.date}
              </Text>
            </View>
            <Text
              variant="bodySmall"
              weight="bold"
              color={item.type === 'credit' ? Colors.success : Colors.error}
            >
              {item.type === 'credit' ? '+' : '-'}${Math.abs(item.amount)}
            </Text>
          </PressableCard>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
});
