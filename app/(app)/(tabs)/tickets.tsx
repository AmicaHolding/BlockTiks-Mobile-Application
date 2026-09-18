import { useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, PressableCard, Badge } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const TABS = ['Upcoming', 'Past', 'Reselling'];

const TICKETS = [
  {
    id: 't1',
    eventTitle: 'DJ MaksMellow Orignawa',
    date: 'Sat, Oct 25 • 8:00 PM',
    venue: 'Madison Square Garden',
    ticketType: 'General Admission',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
    qrData: 'TICKET-12345',
  },
  {
    id: 't2',
    eventTitle: 'NBA Finals: Game 4',
    date: 'Sun, Oct 26 • 7:30 PM',
    venue: 'Crypto.com Arena',
    ticketType: 'VIP',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    qrData: 'TICKET-67890',
  },
];

export default function TicketsScreen() {
  const [activeTab, setActiveTab] = useState('Upcoming');

  return (
    <Screen>
      <Text variant="heading1" weight="bold" style={styles.title}>
        My Tickets
      </Text>

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <PressableCard
              key={tab}
              variant="ghost"
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                variant="bodySmall"
                weight={active ? 'semibold' : 'regular'}
                color={active ? Colors.primary : Colors.textMuted}
              >
                {tab}
              </Text>
            </PressableCard>
          );
        })}
      </View>

      <FlatList
        data={TICKETS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableCard style={styles.ticketCard}>
            <Image source={{ uri: item.image }} style={styles.ticketImage} />
            <View style={styles.ticketInfo}>
              <Badge text={item.ticketType} />
              <Text variant="heading3" weight="bold" style={styles.ticketTitle}>
                {item.eventTitle}
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                {item.date}
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted} numberOfLines={1}>
                {item.venue}
              </Text>
            </View>
          </PressableCard>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" color={Colors.textMuted} center>
              No {activeTab.toLowerCase()} tickets yet.
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.backgroundElevated,
  },
  tabActive: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  ticketCard: {
    flexDirection: 'row',
    padding: 12,
  },
  ticketImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  ticketInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ticketTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
  },
});
