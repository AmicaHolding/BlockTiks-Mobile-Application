import { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Card, PressableCard, IconButton, Input, Badge } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const CATEGORIES = ['All', 'Music', 'Sports', 'Theater', 'Comedy', 'Festivals'];

const EVENTS = [
  {
    id: '1',
    title: 'DJ MaksMellow Orignawa',
    category: 'Music',
    date: 'Sat, Oct 25 • 8:00 PM',
    location: 'Madison Square Garden, NY',
    price: 85,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
  },
  {
    id: '2',
    title: 'NBA Finals: Game 4',
    category: 'Sports',
    date: 'Sun, Oct 26 • 7:30 PM',
    location: 'Crypto.com Arena, LA',
    price: 220,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  },
  {
    id: '3',
    title: 'Hamilton',
    category: 'Theater',
    date: 'Mon, Oct 27 • 7:00 PM',
    location: 'Richard Rodgers Theatre, NY',
    price: 150,
    image: 'https://images.unsplash.com/photo-1503095392237-fc63a94e9cc8?w=800&q=80',
  },
  {
    id: '4',
    title: 'Comedy Night Live',
    category: 'Comedy',
    date: 'Fri, Oct 31 • 9:00 PM',
    location: 'The Laugh Factory, Chicago',
    price: 45,
    image: 'https://images.unsplash.com/photo-1527224857830-43a7acc95260?w=800&q=80',
  },
];

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filteredEvents = EVENTS.filter(
    (event) =>
      (selectedCategory === 'All' || event.category === selectedCategory) &&
      event.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Screen safe={false}>
      <View style={styles.header}>
        <View>
          <Text variant="bodySmall" color={Colors.textMuted}>
            Welcome back
          </Text>
          <Text variant="heading2" weight="bold">
            BlockTiks
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            name="qr-code-outline"
            onPress={() => router.push('/(app)/scanner')}
          />
          <IconButton
            name="notifications-outline"
            onPress={() => router.push('/(app)/notifications')}
          />
        </View>
      </View>

      <Input
        placeholder="Search events..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => {
          const active = item === selectedCategory;
          return (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item)}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <Text
                variant="bodySmall"
                weight={active ? 'semibold' : 'regular'}
                color={active ? Colors.white : Colors.textMuted}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.eventList}
        renderItem={({ item }) => (
          <PressableCard
            style={styles.eventCard}
            onPress={() => router.push({ pathname: '/(app)/events/[id]', params: { id: item.id } })}
          >
            <Image source={{ uri: item.image }} style={styles.eventImage} />
            <View style={styles.eventContent}>
              <Badge text={item.category} />
              <Text variant="heading3" weight="bold" style={styles.eventTitle}>
                {item.title}
              </Text>
              <View style={styles.eventMeta}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text variant="bodySmall" color={Colors.textMuted}>
                  {item.date}
                </Text>
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text variant="bodySmall" color={Colors.textMuted} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
              <Text variant="bodySmall" weight="semibold" color={Colors.success} style={styles.price}>
                ${item.price} onwards
              </Text>
            </View>
          </PressableCard>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categories: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundElevated,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  eventList: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    overflow: 'hidden',
    padding: 0,
  },
  eventImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    marginTop: 8,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    marginTop: 8,
  },
});
