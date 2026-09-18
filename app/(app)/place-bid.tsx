import { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, AppHeader, Input, Button, Card, useToast } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

export default function PlaceBidScreen() {
  const [bid, setBid] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handlePlaceBid = () => {
    if (!bid) {
      show('Please enter a bid amount', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Bid placed successfully', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Place Bid" showBack />

      <Card style={styles.card}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80' }}
          style={styles.image}
        />
        <Text variant="heading3" weight="bold" style={styles.title}>
          Cyberpunk Music Concert
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted}>
          Current market price: $140
        </Text>
      </Card>

      <Input
        label="Your Bid"
        placeholder="Enter bid amount"
        keyboardType="decimal-pad"
        value={bid}
        onChangeText={setBid}
      />
      <Input label="Expiration (optional)" placeholder="e.g. 24 hours" />

      <Button title="Place Bid" loading={loading} onPress={handlePlaceBid} />
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
