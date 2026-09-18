import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Avatar, Button } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { USER_PROFILE, EVENTS } from '@/services/data';
import { useAuthStore } from '@/store/authStore';

export default function CreatorProfileScreen() {
  const { setRole } = useAuthStore();

  const switchToUser = async () => {
    await setRole('user');
    router.replace('/(app)/user');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text variant="heading2" weight="bold">
          Profile
        </Text>
        <TouchableOpacity onPress={() => router.push('/(app)/profile-settings')}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileHeader}>
        <Avatar uri={USER_PROFILE.avatar} name={USER_PROFILE.name} size={96} />
        <Text variant="heading2" weight="bold" style={styles.name}>
          {USER_PROFILE.name}
        </Text>
        <Text variant="bodySmall" color={Colors.textMuted}>
          Event Creator
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="heading3" weight="bold" center>
            12
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted} center>
            Events
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading3" weight="bold" center>
            {USER_PROFILE.followers}
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted} center>
            Followers
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="heading3" weight="bold" center>
            9.4k
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted} center>
            Tickets Sold
          </Text>
        </View>
      </View>

      <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
        Bio
      </Text>
      <Text variant="bodySmall" color={Colors.textMuted} style={styles.bio}>
        {USER_PROFILE.bio}
      </Text>

      <Button
        title="Edit Profile"
        variant="outline"
        onPress={() => router.push('/(app)/edit-profile')}
        style={styles.editButton}
      />
      <Button
        title="Switch to User Mode"
        variant="outline"
        onPress={switchToUser}
        style={styles.switchButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  profileHeader: {
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
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  bio: {
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  editButton: {
    marginTop: 'auto',
  },
  switchButton: {
    marginTop: 12,
    marginBottom: 24,
  },
});
