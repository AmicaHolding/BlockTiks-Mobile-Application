import { useState } from 'react';
import { View, StyleSheet, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, Input, PressableCard } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const MOCK_RESULTS = [
  {
    id: '1',
    title: 'Electronic Nights',
    date: 'Oct 25 • 8:00 PM',
    location: 'Brooklyn Warehouse',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
  },
  {
    id: '2',
    title: 'Jazz in the Park',
    date: 'Oct 28 • 6:00 PM',
    location: 'Central Park',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
  },
  {
    id: '3',
    title: 'Tech Summit 2026',
    date: 'Nov 02 • 9:00 AM',
    location: 'Moscone Center',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <Screen>
      <Text variant="heading1" weight="bold" style={styles.title}>
        Search
      </Text>
      <Input
        placeholder="Search events, artists, venues..."
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
      />

      <FlatList
        data={MOCK_RESULTS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableCard
            style={styles.resultCard}
            onPress={() => router.push({ pathname: '/(app)/events/[id]', params: { id: item.id } })}
          >
            <Image source={{ uri: item.image }} style={styles.resultImage} />
            <View style={styles.resultContent}>
              <Text variant="heading3" weight="bold">
                {item.title}
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                {item.date}
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          </PressableCard>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" color={Colors.textMuted} center>
              No events found. Try a different search.
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
  searchInput: {
    marginBottom: 16,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  resultContent: {
    flex: 1,
    marginLeft: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
  },
});
