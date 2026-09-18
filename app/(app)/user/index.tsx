import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  FlatList,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, SearchField, SectionHeader, EventCard, Button } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS, CATEGORIES } from '@/services/data';

const { width } = Dimensions.get('window');
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  'https://images.unsplash.com/photo-1503095392237-fc63a94e9cc8?w=800&q=80',
];

export default function ForYouScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

  return (
    <Screen scrollable noPadding>
      <View style={styles.heroContainer}>
        <FlatList
          ref={flatListRef}
          data={HERO_IMAGES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveSlide(index);
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.heroImage} />
          )}
          keyExtractor={(_, i) => i.toString()}
        />
        <View style={styles.heroOverlay} />

        <View style={styles.heroTopContent}>
          <AppHeader showLogo showNotification />
          <View style={styles.searchWrapper}>
            <SearchField
              readOnly
              onPress={() => router.push('/(app)/search')}
            />
          </View>
        </View>

        <View style={styles.heroBottomContent}>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Music Concert
          </Text>
          <Text variant="hero" weight="bold" style={styles.heroTitle}>
            DJ MaksMellow Orignawa
          </Text>
          <View style={styles.heroMeta}>
            <Text variant="bodySmall" weight="bold" color={Colors.white}>
              $450
            </Text>
            <Text variant="bodySmall" color={Colors.textMuted}>
              /person
            </Text>
            <View style={styles.dots}>
              {HERO_IMAGES.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, activeSlide === i && styles.dotActive]}
                />
              ))}
            </View>
            <Text variant="bodySmall" color={Colors.textMuted}>
              April 20, 2024
            </Text>
          </View>
          <Button
            title="Event Details"
            onPress={() => router.push('/(app)/events/1')}
          />
        </View>
      </View>

      <View style={styles.categories}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <View key={cat} style={styles.categoryChip}>
              <Text variant="bodySmall" weight="medium">
                {cat}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Trending"
          actionLabel="See All"
          onAction={() => router.push('/(app)/search')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {EVENTS.map((event) => (
            <EventCard
              key={event.id}
              image={event.image}
              title={event.title}
              type={event.category}
              price={`$${event.price}`}
              onPress={() => router.push(`/(app)/events/${event.id}`)}
              showDate
              date={event.date}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Sporting" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[EVENTS[1], EVENTS[3]].map((event) => (
            <EventCard
              key={event.id}
              image={event.image}
              title={event.title}
              type={event.category}
              price={`$${event.price}`}
              onPress={() => router.push(`/(app)/events/${event.id}`)}
              showDate
              date={event.date}
            />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.section, { paddingBottom: 32 }]}>
        <SectionHeader title="Concerts" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[EVENTS[0], EVENTS[2]].map((event) => (
            <EventCard
              key={event.id}
              image={event.image}
              title={event.title}
              type={event.category}
              price={`$${event.price}`}
              onPress={() => router.push(`/(app)/events/${event.id}`)}
              showDate
              date={event.date}
            />
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 520,
    width,
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  heroImage: {
    width,
    height: 520,
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroTopContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
  },
  searchWrapper: {
    marginTop: 8,
  },
  heroBottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heroTitle: {
    marginTop: 8,
    marginBottom: 16,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  dots: {
    flexDirection: 'row',
    marginLeft: 'auto',
    marginRight: Spacing.md,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  categories: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
