import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, PressableCard, SearchField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

const GUESTS = [
  { id: '1', name: 'John Doe', ticket: 'Platinum' },
  { id: '2', name: 'Jane Smith', ticket: 'Gold' },
  { id: '3', name: 'Mike Johnson', ticket: 'Silver' },
];

export default function AllGuestsScreen() {
  return (
    <Screen>
      <AppHeader title="All Guests" showBack />
      <SearchField placeholder="Search guests" readOnly />
      {GUESTS.map((guest) => (
        <PressableCard key={guest.id} variant="pressed" style={styles.row}>
          <View style={styles.avatar}>
            <Text variant="bodySmall" weight="bold">{guest.name.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text variant="bodySmall" weight="bold">{guest.name}</Text>
            <Text variant="caption" color={Colors.textMuted}>{guest.ticket} Ticket</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </PressableCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
});
