import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Button } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';

export default function UpcomingEventScreen() {
  return (
    <Screen scrollable>
      <AppHeader title="Upcoming Event" showBack />
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80' }}
        style={styles.image}
      />
      <Text variant="heading2" weight="bold" style={styles.title}>
        Cyberpunk Music Concert
      </Text>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
        <Text variant="bodySmall" color={Colors.textMuted} style={styles.rowText}>
          April 20, 2024 · 8:00 PM
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={18} color={Colors.primary} />
        <Text variant="bodySmall" color={Colors.textMuted} style={styles.rowText}>
          Madison Square Garden, New York
        </Text>
      </View>
      <Button
        title="View Ticket"
        onPress={() => router.push('/(app)/purchased-ticket')}
        style={styles.button}
      />
      <Button
        title="Set Reminder"
        variant="outline"
        onPress={() => {}}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 220,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rowText: {
    marginLeft: 8,
  },
  button: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
