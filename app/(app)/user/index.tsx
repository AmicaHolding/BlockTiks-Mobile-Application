import { Screen, SearchField, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { eventsForFilter, FEED_FILTERS } from '@/services/data';
import { haptic } from '@/services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ForYouScreen() {
  const [activeFilter, setActiveFilter] = useState('For You');
  const events = eventsForFilter(activeFilter);
  const featured = events[0];
  const rest = events.slice(1);

  const openEvent = (id: string) => {
    haptic.light();
    router.push(`/(app)/events/${id}`);
  };

  return (
    <Screen scrollable noPadding>
      <View style={styles.header}>
        <View>
          <Text variant="label" color={Colors.textMuted} style={styles.locationLabel}>
            Discover
          </Text>
          <Text variant="heading1" weight="bold">
            What's happening
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/(app)/search')}
          accessibilityLabel="Search events"
        >
          <Ionicons name="search-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <SearchField
        placeholder="Search events, artists, venues"
        readOnly
        onPress={() => router.push('/(app)/search')}
        containerStyle={styles.searchWrap}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FEED_FILTERS.map((filter) => {
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

      {featured ? (
        <>
          <View style={styles.sectionPadding}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => openEvent(featured.id)} style={styles.heroCard}>
              <Image source={{ uri: featured.image }} style={styles.heroImage} />
              <View style={styles.heroScrim} />
              <View style={styles.heroContent}>
                <Text variant="caption" color="rgba(255,255,255,0.75)">
                  Featured · {featured.category}
                </Text>
                <Text variant="heading1" weight="bold" style={styles.heroTitle} numberOfLines={2}>
                  {featured.title}
                </Text>
                <Text variant="bodySmall" color="rgba(255,255,255,0.75)">
                  {featured.date} · {featured.location}
                </Text>
                <View style={styles.heroPricePill}>
                  <Text variant="bodySmall" weight="semibold" color={Colors.ink}>
                    From ${featured.price}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <Text variant="heading2" weight="bold" style={[styles.sectionPadding, styles.sectionTitle]}>
            {activeFilter === 'For You' ? 'Happening soon' : activeFilter}
          </Text>

          <FlatList
            data={rest}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={[styles.sectionPadding, styles.feed]}
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.9} onPress={() => openEvent(item.id)} style={styles.feedCard}>
                <Image source={{ uri: item.image }} style={styles.feedImage} />
                <View style={styles.feedInfo}>
                  <Text variant="caption" color={Colors.textMuted}>
                    {item.date}
                  </Text>
                  <Text variant="heading3" weight="bold" style={styles.feedTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text variant="bodySmall" color={Colors.textMuted} numberOfLines={1}>
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
        </>
      ) : (
        <View style={styles.sectionPadding}>
          <Text variant="body" color={Colors.textMuted} center>
            Nothing here yet — check back soon.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.md,
  },
  locationLabel: {
    marginBottom: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  },
  heroCard: {
    width: '100%',
    height: 400,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
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
  heroPricePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    marginTop: 10,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  feed: {
    gap: Spacing.lg,
    paddingBottom: 100,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedImage: {
    width: 104,
    height: 104,
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
    marginLeft: Spacing.sm,
  },
});
