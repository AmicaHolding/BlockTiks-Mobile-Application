import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, Avatar, Button } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

export default function OtherUserProfileScreen() {
  return (
    <Screen>
      <AppHeader title="Profile" showBack />
      <View style={styles.header}>
        <Avatar uri="https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80" name="Alex" size={100} />
        <Text variant="heading2" weight="bold" style={styles.name}>
          Alex Morgan
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted}>
          Event Enthusiast
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="heading3" weight="bold" center>24</Text>
          <Text variant="caption" color={Colors.textMuted} center>Events</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading3" weight="bold" center>1.2k</Text>
          <Text variant="caption" color={Colors.textMuted} center>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading3" weight="bold" center>86</Text>
          <Text variant="caption" color={Colors.textMuted} center>Following</Text>
        </View>
      </View>

      <Button title="Follow" onPress={() => router.back()} />
      <Button title="Message" variant="outline" style={{ marginTop: 12 }} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  name: {
    marginTop: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xxl,
  },
  stat: {
    alignItems: 'center',
  },
});
