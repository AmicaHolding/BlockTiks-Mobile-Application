import { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, AppHeader, Input, Button, Card, useToast } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

export default function AskBidScreen() {
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const handleAsk = () => {
    if (!price) {
      show('Please enter an asking price', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      show('Ask listed successfully', 'success');
      router.back();
    }, 1200);
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <AppHeader title="Ask Bid" showBack />

      <Card style={styles.card}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80' }}
          style={styles.image}
        />
        <Text variant="heading3" weight="bold" style={styles.title}>
          Cyberpunk Music Concert
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted}>
          Face value: $110
        </Text>
      </Card>

      <Input
        label="Asking Price"
        placeholder="Enter asking price"
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
      />
      <Input label="Expiration (optional)" placeholder="e.g. 48 hours" />

      <Button title="List Ask" loading={loading} onPress={handleAsk} />
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
