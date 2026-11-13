import { AppHeader, Button, Card, Input, Screen, Text, useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { EVENTS, MARKET_LISTINGS } from '@/services/data';
import { haptic } from '@/services/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet } from 'react-native';

export default function PlaceBidScreen() {
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const listing = MARKET_LISTINGS.find((l) => l.id === listingId);
  const event = EVENTS.find((e) => e.id === (listing?.eventId ?? '')) || EVENTS[0];

  const [bid, setBid] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handlePlaceBid = () => {
    const amount = parseFloat(bid);
    if (!bid || isNaN(amount) || amount <= 0) {
      show('Please enter a valid bid amount', 'error');
      return;
    }
    setLoading(true);
    // TODO(backend): POST /marketplace/bids once the MVP API is live.
    setTimeout(() => {
      setLoading(false);
      haptic.success();
      show('Bid placed', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Make an offer" showBack />

      <Card style={styles.card}>
        <Image source={{ uri: event.image }} style={styles.image} />
        <Text variant="heading3" weight="bold" style={styles.title}>
          {event.title}
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted}>
          {listing ? `${listing.tier} · listed at $${listing.price}` : 'Select a listing to bid on'}
        </Text>
      </Card>

      <Input
        label="Your offer"
        placeholder="Enter amount"
        keyboardType="decimal-pad"
        value={bid}
        onChangeText={setBid}
      />

      <Button title="Place offer" loading={loading} onPress={handlePlaceBid} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: 4,
  },
});
