import { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, SearchField, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS } from '@/services/data';

const TABS = ['Marketplace', 'Asks', 'Bids', 'History'];

const LISTINGS = [
  { id: '1', eventId: '1', type: 'Selling', qty: 2, price: 95, original: 85 },
  { id: '2', eventId: '2', type: 'Buying', qty: 1, price: 120, original: 150 },
  { id: '3', eventId: '3', type: 'Selling', qty: 1, price: 210, original: 200 },
];

export default function ResellScreen() {
  const [activeTab, setActiveTab] = useState(0);

  const renderEventMarketItem = (event: typeof EVENTS[0]) => (
    <PressableCard
      key={event.id}
      variant="pressed"
      style={styles.marketCard}
      onPress={() => router.push('/(app)/place-bid')}
    >
      <Image source={{ uri: event.image }} style={styles.marketImage} />
      <View style={styles.marketInfo}>
        <Text variant="body" weight="medium" numberOfLines={1}>{event.title}</Text>
        <Text variant="caption" color={Colors.textMuted}>{event.date}</Text>
      </View>
      <View style={styles.priceStack}>
        <Text variant="bodySmall" weight="bold">${event.price}</Text>
        <Text variant="caption" color={Colors.textMuted}>Face value</Text>
      </View>
      <View style={[styles.priceStack, { marginLeft: 12 }]}>
        <Text variant="bodySmall" weight="bold" color={Colors.successBright}>${event.price + 10}</Text>
        <Text variant="caption" color={Colors.textMuted}>Market</Text>
      </View>
    </PressableCard>
  );

  return (
    <Screen>
      <AppHeader title="Resell" showNotification />
      <SearchField
        readOnly
        onPress={() => router.push('/(app)/search')}
        containerStyle={{ marginBottom: Spacing.lg }}
      />

      <View style={styles.tabRow}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === idx && styles.tabActive]}
            onPress={() => setActiveTab(idx)}
          >
            <Text
              variant="bodySmall"
              weight={activeTab === idx ? 'bold' : 'regular'}
              color={activeTab === idx ? Colors.ink : Colors.text}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 0 && (
        <FlatList
          data={EVENTS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => renderEventMarketItem(item)}
        />
      )}

      {activeTab !== 0 && (
        <FlatList
          data={LISTINGS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const event = EVENTS.find((e) => e.id === item.eventId) || EVENTS[0];
            return (
              <PressableCard
                variant="pressed"
                style={styles.bidCard}
                onPress={() => router.push('/(app)/place-bid')}
              >
                <Image source={{ uri: event.image }} style={styles.bidImage} />
                <View style={styles.bidInfo}>
                  <Text variant="body" weight="medium" numberOfLines={1}>{event.title}</Text>
                  <Text variant="caption" color={Colors.textMuted}>
                    {item.type} · {item.qty} ticket{item.qty > 1 ? 's' : ''}
                  </Text>
                  <Text variant="bodySmall" weight="bold" color={item.type === 'Selling' ? Colors.success : Colors.primaryBright}>
                    ${item.price}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </PressableCard>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="body" color={Colors.textMuted} center>
                No {TABS[activeTab].toLowerCase()} yet.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  marketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  marketImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    marginRight: 12,
  },
  marketInfo: {
    flex: 1,
    marginRight: 8,
  },
  priceStack: {
    alignItems: 'flex-end',
  },
  bidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  bidImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
    marginRight: 12,
  },
  bidInfo: {
    flex: 1,
    marginRight: 8,
  },
  empty: {
    marginTop: 48,
  },
});
