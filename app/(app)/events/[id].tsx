import { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Screen,
  Button,
  Card,
  IconButton,
  Badge,
  TicketCounter,
  useToast,
} from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS } from '@/services/data';

const { width } = Dimensions.get('window');

const TICKET_TYPES = [
  { title: 'Platinum Ticket', price: 405, color: '#3B88C4' },
  { title: 'Gold Ticket', price: 305, color: '#FEA846' },
  { title: 'Silver Ticket', price: 205, color: '#A0A0B0' },
  { title: 'Bronze Ticket', price: 105, color: '#8B4513' },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = EVENTS.find((e) => e.id === id) || EVENTS[0];
  const { show } = useToast();

  const [counts, setCounts] = useState<Record<string, number>>({
    'Platinum Ticket': 0,
    'Gold Ticket': 0,
    'Silver Ticket': 0,
    'Bronze Ticket': 0,
  });

  const subtotal = TICKET_TYPES.reduce((sum, t) => sum + counts[t.title] * t.price, 0);

  const handleNext = () => {
    if (subtotal === 0) {
      show('Please select at least one ticket', 'error');
      return;
    }
    router.push('/(app)/payment-page');
  };

  const openDirections = () => {
    const lat = event.coordinates?.lat ?? 25.1975;
    const lng = event.coordinates?.lng ?? 55.2743;
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  };

  return (
    <Screen safe={false} scrollable={false} noPadding>
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.image }} style={styles.image} />
        <View style={styles.overlay} />
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          style={styles.backButton}
          backgroundColor="rgba(0,0,0,0.3)"
        />
        <IconButton
          name="share-outline"
          onPress={() => show('Share coming soon', 'info')}
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
        <Text variant="heading3" weight="bold" color={Colors.text} style={styles.subtitle}>
          {event.description.slice(0, 40)}...
        </Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
          <View style={styles.infoText}>
            <Text variant="body" weight="medium">
              {event.date}
            </Text>
            <Text variant="bodySmall" color={Colors.textMuted}>
              {event.time}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={22} color={Colors.primary} />
          <View style={styles.infoText}>
            <Text variant="body" weight="medium" style={styles.locationText}>
              {event.location}
            </Text>
          </View>
          <TouchableOpacity onPress={openDirections}>
            <Text variant="bodySmall" weight="medium" color={Colors.primary}>
              Direction
            </Text>
          </TouchableOpacity>
        </View>

        <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
          About Event
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted} style={styles.description}>
          {event.description}
        </Text>

        <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
          Select Tickets
        </Text>
        {TICKET_TYPES.map((ticket) => (
          <TicketCounter
            key={ticket.title}
            title={ticket.title}
            price={ticket.price}
            count={counts[ticket.title]}
            color={ticket.color}
            onIncrement={() =>
              setCounts((prev) => ({ ...prev, [ticket.title]: Math.min(prev[ticket.title] + 1, 10) }))
            }
            onDecrement={() =>
              setCounts((prev) => ({ ...prev, [ticket.title]: Math.max(prev[ticket.title] - 1, 0) }))
            }
          />
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text variant="caption" color={Colors.textMuted}>
            Subtotal
          </Text>
          <Text variant="heading2" weight="bold" color={Colors.success}>
            ${subtotal}
          </Text>
        </View>
        <Button title="Next" onPress={handleNext} style={styles.buyButton} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    height: 340,
  },
  image: {
    width,
    height: 340,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    flexShrink: 1,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  description: {
    lineHeight: 22,
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
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  buyButton: {
    width: 140,
  },
});
