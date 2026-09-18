import { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, SearchField, PressableCard, EmptyState, Button } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';
import { EVENTS, MARKET_LISTINGS, USER_LISTINGS } from '@/services/data';

const TABS = ['Marketplace', 'My listings', 'History'];

export default function ResellScreen() {
  const [activeTab, setActiveTab] = useState(0);

  const marketRenderItem = ({ item }: { item: typeof MARKET_LISTINGS[0] }) => {
    const event = EVENTS.find((e) => e.id === item.eventId) || EVENTS[0];
    const discount = item.price < item.faceValue;
    const premium = item.price > item.faceValue;
    return (
      <PressableCard
        variant="pressed"
        style={styles.marketCard}
        onPress={() => {
          haptic.light();
          router.push('/(app)/place-bid');
        }}
      >
        <Image source={{ uri: event.image }} style={styles.marketImage} />
        <View style={styles.marketInfo}>
          <Text variant="body" weight="medium" numberOfLines={1}>
            {event.title}
          </Text>
          <Text variant="caption" color={Colors.textMuted}>
            {item.tier}
          </Text>
          <View style={styles.sellerRow}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text variant="caption" color={Colors.textMuted} style={styles.sellerText}>
              {item.sellerName} · {item.sellerRating}
            </Text>
          </View>
        </View>
        <View style={styles.marketPrice}>
          <Text variant="heading3" weight="bold">${item.price}</Text>
          {discount && (
            <View style={styles.badgeSuccess}>
              <Text variant="caption" color={Colors.successBright}>
                -${item.faceValue - item.price}
              </Text>
            </View>
          )}
          {premium && (
            <View style={styles.badgeNeutral}>
              <Text variant="caption" color={Colors.textMuted}>
                +${item.price - item.faceValue}
              </Text>
            </View>
          )}
        </View>
      </PressableCard>
    );
  };

  const listingRenderItem = ({ item }: { item: typeof USER_LISTINGS[0] }) => {
    const event = EVENTS.find((e) => e.id === item.eventId) || EVENTS[0];
    return (
      <PressableCard variant="pressed" style={styles.listingCard}>
        <Image source={{ uri: event.image }} style={styles.listingImage} />
        <View style={styles.listingInfo}>
          <Text variant="body" weight="medium" numberOfLines={1}>{event.title}</Text>
          <Text variant="caption" color={Colors.textMuted}>
            {item.quantity} × {item.tier} · ${item.price}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? `${Colors.success}20` : `${Colors.textMuted}20` }]}>
            <Text variant="caption" color={item.status === 'active' ? Colors.success : Colors.textMuted}>
              {item.status}
            </Text>
          </View>
        </View>
      </PressableCard>
    );
  };

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
            onPress={() => {
              haptic.light();
              setActiveTab(idx);
            }}
          >
            <Text variant="bodySmall" weight={activeTab === idx ? 'bold' : 'regular'} color={activeTab === idx ? Colors.ink : Colors.text}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 0 && (
        <FlatList
          data={MARKET_LISTINGS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.marketHeader}>
              <Text variant="heading3" weight="bold">Available now</Text>
              <PressableCard variant="ghost" onPress={() => {}}>
                <Text variant="bodySmall" color={Colors.primaryBright}>Sort</Text>
              </PressableCard>
            </View>
          }
          renderItem={marketRenderItem}
          ListEmptyComponent={
            <EmptyState icon="basket-outline" title="No listings" subtitle="There are no tickets available on the market right now." />
          }
        />
      )}

      {activeTab === 1 && (
        <FlatList
          data={USER_LISTINGS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Button
              title="List a ticket"
              onPress={() => {
                haptic.medium();
                router.push('/(app)/place-bid');
              }}
            />
          }
          renderItem={listingRenderItem}
          ListEmptyComponent={
            <EmptyState
              icon="pricetag-outline"
              title="No listings yet"
              subtitle="Sell tickets you can't use on the marketplace."
              actionTitle="List a ticket"
              onAction={() => router.push('/(app)/place-bid')}
            />
          }
        />
      )}

      {activeTab === 2 && (
        <EmptyState
          icon="time-outline"
          title="No history"
          subtitle="Your past buys, sells, and bids will appear here."
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
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  marketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  marketImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.sm,
    marginRight: 12,
  },
  marketInfo: {
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sellerText: {
    marginLeft: 4,
  },
  marketPrice: {
    alignItems: 'flex-end',
  },
  badgeSuccess: {
    marginTop: 4,
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeNeutral: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  listingImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginTop: 6,
  },
});
