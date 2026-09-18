import { View, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Button, Card, IconButton, Badge } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const EVENTS = [
  {
    id: '1',
    title: 'DJ MaksMellow Orignawa',
    category: 'Music',
    date: 'Saturday, October 25',
    time: '8:00 PM - 11:00 PM',
    location: 'Madison Square Garden, New York',
    description:
      'Join us for an unforgettable night of electronic music with DJ MaksMellow Orignawa. Experience stunning visuals and a state-of-the-art sound system.',
    price: 85,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
    organizer: 'Amica Events',
  },
  {
    id: '2',
    title: 'NBA Finals: Game 4',
    category: 'Sports',
    date: 'Sunday, October 26',
    time: '7:30 PM - 10:30 PM',
    location: 'Crypto.com Arena, Los Angeles',
    description:
      'The biggest basketball event of the year. Watch the finals live with thousands of fans.',
    price: 220,
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    organizer: 'NBA',
  },
  {
    id: '3',
    title: 'Hamilton',
    category: 'Theater',
    date: 'Monday, October 27',
    time: '7:00 PM - 9:30 PM',
    location: 'Richard Rodgers Theatre, New York',
    description: 'The story of America then, told by America now.',
    price: 150,
    image: 'https://images.unsplash.com/photo-1503095392237-fc63a94e9cc8?w=800&q=80',
    organizer: 'Broadway League',
  },
  {
    id: '4',
    title: 'Comedy Night Live',
    category: 'Comedy',
    date: 'Friday, October 31',
    time: '9:00 PM - 11:00 PM',
    location: 'The Laugh Factory, Chicago',
    description: 'A night of laughter with top stand-up comedians.',
    price: 45,
    image: 'https://images.unsplash.com/photo-1527224857830-43a7acc95260?w=800&q=80',
    organizer: 'Laugh Factory',
  },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = EVENTS.find((e) => e.id === id) || EVENTS[0];

  return (
    <Screen safe={false} scrollable={false}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.image }} style={styles.image} />
        <View style={StyleSheet.absoluteFill} />
        <IconButton
          name="arrow-back"
          onPress={() => router.back()}
          style={styles.backButton}
          backgroundColor="rgba(0,0,0,0.3)"
        />
        <IconButton
          name="share-outline"
          onPress={() => {}}
          style={styles.shareButton}
          backgroundColor="rgba(0,0,0,0.3)"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Badge text={event.category} />
        <Text variant="heading1" weight="bold" style={styles.title}>
          {event.title}
        </Text>

        <Card variant="elevated" style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <View style={styles.metaText}>
              <Text variant="body" weight="medium">
                {event.date}
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                {event.time}
              </Text>
            </View>
          </View>
          <View style={[styles.metaRow, { marginTop: 12 }]}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} />
            <View style={styles.metaText}>
              <Text variant="body" weight="medium">
                {event.location}
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
          About
        </Text>
        <Text variant="body" color={Colors.textMuted} style={styles.description}>
          {event.description}
        </Text>

        <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
          Organizer
        </Text>
        <Text variant="body" color={Colors.textMuted}>
          {event.organizer}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text variant="caption" color={Colors.textMuted}>
            Starting from
          </Text>
          <Text variant="heading2" weight="bold" color={Colors.success}>
            ${event.price}
          </Text>
        </View>
        <Button
          title="Buy Ticket"
          onPress={() => router.push('/(app)/payment-page')}
          style={styles.buyButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    height: 320,
  },
  image: {
    width,
    height: 320,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 16,
  },
  shareButton: {
    position: 'absolute',
    top: 56,
    right: 16,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    marginTop: 12,
    marginBottom: 16,
  },
  metaCard: {
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  buyButton: {
    width: 160,
  },
});
