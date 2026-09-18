import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

export default function CreatorEventScreen() {
  return (
    <Screen scrollable>
      <AppHeader title="Manage Event" showBack />
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80' }}
        style={styles.image}
      />
      <Text variant="heading2" weight="bold" style={styles.title}>
        DJ MaksMellow Orignawa
      </Text>
      <Text variant="bodySmall" color={Colors.textMuted} style={styles.subtitle}>
        348 tickets sold · $12,450 revenue
      </Text>

      <View style={styles.actions}>
        <Button
          title="Edit Event"
          variant="outline"
          onPress={() => router.push('/(app)/events/create')}
          style={styles.actionButton}
        />
        <Button
          title="Guests"
          variant="outline"
          onPress={() => router.push('/(app)/all-guests')}
          style={styles.actionButton}
        />
      </View>

      <PressableCard variant="pressed" style={styles.row} onPress={() => router.push('/(app)/broadcast-message')}>
        <Ionicons name="megaphone-outline" size={22} color={Colors.primary} />
        <Text variant="bodySmall" weight="medium" style={styles.rowText}>Broadcast Message</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </PressableCard>
      <PressableCard variant="pressed" style={styles.row} onPress={() => router.push('/(app)/analytics')}>
        <Ionicons name="bar-chart-outline" size={22} color={Colors.primary} />
        <Text variant="bodySmall" weight="medium" style={styles.rowText}>Analytics</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </PressableCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: Spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
});
