import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, EventCard, SearchField } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { haptic } from '@/services/haptics';
import { EVENTS, CATEGORIES } from '@/services/data';

const { width } = Dimensions.get('window');

const FILTERS = ['For You', 'Tonight', 'This Weekend', 'Music', 'Sports', 'Arts'];

export default function ForYouScreen() {
  const [activeFilter, setActiveFilter] = useState('For You');

  const renderHeroEvent = () => {
    const hero = EVENTS[0];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
            haptic.light();
            router.push(`/(app)/events/${hero.id}`);
          }}
        style={styles.heroCard}
      >
        <Image source={{ uri: hero.image }} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text variant="caption" color={Colors.textMuted}>
            Featured · {hero.category}
          </Text>
          <Text variant="heading1" weight="bold" style={styles.heroTitle}>
            {hero.title}
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted}>
            {hero.date} · {hero.location}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scrollable noPadding>
      <View style={styles.header}>
        <View>
          <Text variant="caption" color={Colors.textMuted}>
            Location
          </Text>
          <View style={styles.locationRow}>
            <Text variant="body" weight="medium">
              New York
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} style={styles.locationIcon} />
          </View>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/(app)/search')}
        >
          <Ionicons name="search-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => {
                haptic.light();
                setActiveFilter(filter);
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                variant="bodySmall"
                weight={active ? 'semibold' : 'regular'}
                color={active ? Colors.ink : Colors.text}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sectionPadding}>
        {renderHeroEvent()}

        <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
          Happening soon
        </Text>

        <FlatList
          data={EVENTS.slice(1)}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.feed}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
              haptic.light();
              router.push(`/(app)/events/${item.id}`);
            }}
              style={styles.feedCard}
            >
              <Image source={{ uri: item.image }} style={styles.feedImage} />
              <View style={styles.feedInfo}>
                <Text variant="caption" color={Colors.textMuted}>
                  {item.date}
                </Text>
                <Text variant="heading3" weight="bold" style={styles.feedTitle}>
                  {item.title}
                </Text>
                <Text variant="bodySmall" color={Colors.textMuted}>
                  {item.location}
                </Text>
              </View>
              <View style={styles.pricePill}>
                <Text variant="bodySmall" weight="semibold" color={Colors.ink}>
                  ${item.price}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIcon: {
    marginLeft: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    paddingBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
  },
  filterChipActive: {
    backgroundColor: Colors.white,
  },
  sectionPadding: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  heroCard: {
    width: '100%',
    height: 380,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.lg,
  },
  heroTitle: {
    marginTop: 4,
    marginBottom: 6,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  feed: {
    gap: Spacing.lg,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedImage: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
  },
  feedInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  feedTitle: {
    marginTop: 2,
    marginBottom: 4,
  },
  pricePill: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
});
