import { useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, SearchField, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS, POPULAR_SEARCHES, RECENT_SEARCHES } from '@/services/data';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Events' | 'People'>('Events');

  const results = query.trim()
    ? EVENTS.filter(
        (e) =>
          e.title.toLowerCase().includes(query.toLowerCase()) ||
          e.category.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <Screen>
      <AppHeader title="Search" showBack />
      <SearchField
        value={query}
        onChangeText={setQuery}
        showFilter
        onFilterPress={() => {}}
      />

      {!query ? (
        <>
          <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
            Popular Search
          </Text>
          <View style={styles.chipsRow}>
            {POPULAR_SEARCHES.map((term) => (
              <PressableCard
                key={term}
                variant="pressed"
                style={styles.chip}
                onPress={() => setQuery(term)}
              >
                <Text variant="bodySmall">{term}</Text>
              </PressableCard>
            ))}
          </View>

          <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
            Recent Search
          </Text>
          <FlatList
            data={RECENT_SEARCHES.map((title, idx) => ({ id: idx.toString(), title }))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PressableCard style={styles.recentCard} onPress={() => setQuery(item.title)}>
                <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
                <Text variant="bodySmall" style={styles.recentText}>
                  {item.title}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </PressableCard>
            )}
          />
        </>
      ) : (
        <>
          <View style={styles.tabRow}>
            {(['Events', 'People'] as const).map((tab) => (
              <PressableCard
                key={tab}
                variant="ghost"
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  variant="bodySmall"
                  weight={activeTab === tab ? 'bold' : 'regular'}
                  color={activeTab === tab ? Colors.black : Colors.text}
                >
                  {tab}
                </Text>
              </PressableCard>
            ))}
          </View>

          <FlatList
            data={activeTab === 'Events' ? results : []}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="body" color={Colors.textMuted} center>
                  No {activeTab.toLowerCase()} found for "{query}"
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <PressableCard
                style={styles.resultCard}
                onPress={() => router.push(`/(app)/events/${item.id}`)}
              >
                <Image source={{ uri: item.image }} style={styles.resultImage} />
                <View style={styles.resultInfo}>
                  <Text variant="bodySmall" weight="bold">
                    {item.title}
                  </Text>
                  <Text variant="caption" color={Colors.textMuted}>
                    {item.category}
                  </Text>
                </View>
                <View style={styles.resultPrices}>
                  <View style={styles.priceBox}>
                    <Text variant="caption" color={Colors.textMuted} center>
                      Store
                    </Text>
                    <Text variant="bodySmall" weight="bold" center>
                      ${item.price}
                    </Text>
                  </View>
                </View>
              </PressableCard>
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  recentText: {
    flex: 1,
    marginLeft: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultPrices: {
    flexDirection: 'row',
    gap: 8,
  },
  priceBox: {
    width: 58,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.sm,
  },
  empty: {
    marginTop: 48,
  },
});
