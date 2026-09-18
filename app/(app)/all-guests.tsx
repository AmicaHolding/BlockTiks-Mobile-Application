import { useState } from 'react';
import { View, StyleSheet, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';

const GUESTS = [
  { id: '1', name: 'John Doe', email: 'john@example.com', ticket: 'VIP', checkedIn: true },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', ticket: 'General Admission', checkedIn: false },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', ticket: 'General Admission', checkedIn: false },
  { id: '4', name: 'Anna Lee', email: 'anna@example.com', ticket: 'Backstage Pass', checkedIn: true },
  { id: '5', name: 'David Chen', email: 'david@example.com', ticket: 'VIP', checkedIn: false },
];

export default function AllGuestsScreen() {
  const [query, setQuery] = useState('');

  const filtered = GUESTS.filter(
    (g) =>
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.email.toLowerCase().includes(query.toLowerCase()) ||
      g.ticket.toLowerCase().includes(query.toLowerCase())
  );

  const checkedInCount = filtered.filter((g) => g.checkedIn).length;

  return (
    <Screen>
      <AppHeader title="All guests" showBack />

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search guests"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} onPress={() => setQuery('')} />
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="heading2" weight="bold">{filtered.length}</Text>
          <Text variant="caption" color={Colors.textMuted}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading2" weight="bold" color={Colors.success}>{checkedInCount}</Text>
          <Text variant="caption" color={Colors.textMuted}>Checked in</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading2" weight="bold" color={Colors.primaryBright}>{filtered.length - checkedInCount}</Text>
          <Text variant="caption" color={Colors.textMuted}>Remaining</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableCard variant="pressed" style={styles.row} onPress={() => haptic.light()}>
            <View style={[styles.avatar, { backgroundColor: item.checkedIn ? Colors.success : Colors.primary }]}>
              <Text variant="bodySmall" weight="bold" color={Colors.white}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.info}>
              <Text variant="body" weight="medium">{item.name}</Text>
              <Text variant="caption" color={Colors.textMuted}>{item.ticket}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.checkedIn ? `${Colors.success}20` : 'rgba(255,255,255,0.08)' }]}>
              <Text variant="caption" color={item.checkedIn ? Colors.success : Colors.textMuted}>
                {item.checkedIn ? 'Checked in' : 'Not checked'}
              </Text>
            </View>
          </PressableCard>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" color={Colors.textMuted} center>No guests found</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    marginBottom: Spacing.lg,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginLeft: 10,
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  empty: {
    marginTop: 48,
  },
});
