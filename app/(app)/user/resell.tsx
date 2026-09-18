import { useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Screen,
  AppHeader,
  SearchField,
  PressableCard,
  Button,
} from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS } from '@/services/data';

const TABS = ['Marketplace', 'Asks', 'Bids', 'History'];

const BID_ITEMS = [
  { id: '1', title: 'Cyberpunk', price: 110, type: 'Music Concert', expiry: '2d left' },
  { id: '2', title: 'Rock N Roll', price: 140, type: 'Music Concert', expiry: '5h left' },
  { id: '3', title: 'Epic Bass', price: 60, type: 'Music Concert', expiry: '1d left' },
];

export default function ResellScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Screen>
      <AppHeader title="Resell" showNotification />
      <SearchField
        readOnly
        onPress={() => router.push('/(app)/search')}
        containerStyle={styles.search}
      />

      <View style={styles.tabRow}>
        {TABS.map((tab, idx) => (
          <PressableCard
            key={tab}
            variant="ghost"
            style={styles.tabButton}
            onPress={() => setActiveTab(idx)}
          >
            <Text
              variant="bodySmall"
              weight={activeTab === idx ? 'bold' : 'regular'}
              color={activeTab === idx ? Colors.primary : Colors.textMuted}
            >
              {tab}
            </Text>
            {activeTab === idx && <View style={styles.tabIndicator} />}
          </PressableCard>
        ))}
      </View>

      {activeTab === 0 && (
        <FlatList
          data={EVENTS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PressableCard style={styles.marketCard} onPress={() => router.push('/(app)/place-bid')}>
              <Image source={{ uri: item.image }} style={styles.marketImage} />
              <View style={styles.marketInfo}>
                <Text variant="bodySmall" weight="bold">
                  {item.title}
                </Text>
                <Text variant="caption" color={Colors.textMuted}>
                  {item.category}
                </Text>
              </View>
              <View style={styles.marketPrices}>
                <View style={styles.priceBox}>
                  <Text variant="caption" color={Colors.textMuted} center>
                    Store
                  </Text>
                  <Text variant="bodySmall" weight="bold" center>
                    ${Math.floor(Math.random() * 900 + 100)}
                  </Text>
                </View>
                <View style={styles.priceBox}>
                  <Text variant="caption" color={Colors.textMuted} center>
                    Market
                  </Text>
                  <Text variant="bodySmall" weight="bold" center>
                    ${Math.floor(Math.random() * 900 + 100)}
                  </Text>
                </View>
              </View>
            </PressableCard>
          )}
        />
      )}

      {activeTab !== 0 && (
        <FlatList
          data={BID_ITEMS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PressableCard style={styles.bidCard} onPress={() => router.push('/(app)/place-bid')}>
              <Image source={{ uri: EVENTS[0].image }} style={styles.bidImage} />
              <View style={styles.bidInfo}>
                <Text variant="bodySmall" weight="bold">
                  {item.title}
                </Text>
                <Text variant="caption" color={Colors.textMuted}>
                  {item.type}
                </Text>
                <Text variant="caption" color={Colors.primary}>
                  ${item.price} · {item.expiry}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </PressableCard>
          )}
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
  search: {
    marginBottom: Spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '60%',
    height: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  marketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  marketImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
  },
  marketInfo: {
    flex: 1,
    marginLeft: 12,
  },
  marketPrices: {
    flexDirection: 'row',
    gap: 8,
  },
  priceBox: {
    width: 58,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.sm,
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
  },
  bidInfo: {
    flex: 1,
    marginLeft: 12,
  },
  empty: {
    marginTop: 48,
  },
});
