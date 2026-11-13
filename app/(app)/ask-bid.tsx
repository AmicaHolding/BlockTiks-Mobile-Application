import { AppHeader, Button, Card, Input, Screen, Text, useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/Colors';
import { EVENTS, MY_TICKETS } from '@/services/data';
import { haptic } from '@/services/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet } from 'react-native';

export default function AskBidScreen() {
  const params = useLocalSearchParams<{ eventId?: string; tier?: string; price?: string }>();
  const ticket = MY_TICKETS.find((t) => t.eventId === params.eventId);
  const event = EVENTS.find((e) => e.id === (params.eventId ?? ticket?.eventId)) || EVENTS[0];

  const [price, setPrice] = useState(params.price ?? '');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleAsk = () => {
    const amount = parseFloat(price);
    if (!price || isNaN(amount) || amount <= 0) {
      show('Please enter a valid asking price', 'error');
      return;
    }
    setLoading(true);
    // TODO(backend): POST /marketplace/listings once the MVP API is live.
    setTimeout(() => {
      setLoading(false);
      haptic.success();
      show('Listing created', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="List for sale" showBack />

      <Card style={styles.card}>
        <Image source={{ uri: event.image }} style={styles.image} />
        <Text variant="heading3" weight="bold" style={styles.title}>
          {event.title}
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted}>
          {params.tier ?? ticket?.type ?? 'General Admission'}
          {ticket ? ` · face value $${ticket.price}` : ''}
        </Text>
      </Card>

      <Input
        label="Asking price"
        placeholder="Enter price"
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
      />

      <Button title="List ticket" loading={loading} onPress={handleAsk} />
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
