import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Text, Screen, AppHeader, Button } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

export default function MediaPreviewScreen() {
  return (
    <Screen>
      <AppHeader title="Media Preview" showBack />
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80' }}
        style={styles.image}
        resizeMode="contain"
      />
      <Button
        title="Download"
        variant="outline"
        onPress={() => router.back()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
    width: '100%',
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.black,
  },
});
