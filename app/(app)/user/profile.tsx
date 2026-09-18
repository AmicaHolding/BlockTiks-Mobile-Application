import { useState } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Avatar, EventCard, Button } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS, USER_PROFILE } from '@/services/data';
import { useAuthStore } from '@/store/authStore';

const { width } = Dimensions.get('window');
const TABS = ['Hosted', 'Attended'];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { setRole } = useAuthStore();

  const switchToCreator = async () => {
    await setRole('creator');
    router.replace('/(app)/creator');
  };

  return (
    <Screen scrollable noPadding>
      <View style={styles.headerImageContainer}>
        <Image source={{ uri: EVENTS[0].image }} style={styles.headerImage} />
        <View style={styles.headerOverlay} />
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(app)/profile-settings')}
        >
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <View style={styles.avatarWrapper}>
          <Avatar uri={USER_PROFILE.avatar} name={USER_PROFILE.name} size={100} />
        </View>

        <Text variant="heading1" weight="bold" center>
          {USER_PROFILE.name}
        </Text>
        <Text variant="body" color={Colors.textMuted} center style={styles.roleText}>
          {USER_PROFILE.role}
        </Text>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(app)/follow-following')}>
            <Text variant="heading2" weight="bold" center>{USER_PROFILE.followers}</Text>
            <Text variant="bodySmall" color={Colors.textMuted} center>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(app)/follow-following')}>
            <Text variant="heading2" weight="bold" center>41k</Text>
            <Text variant="bodySmall" color={Colors.textMuted} center>Following</Text>
          </TouchableOpacity>
        </View>

        <Text variant="heading3" weight="bold" style={styles.bioTitle}>Bio</Text>
        <Text variant="bodySmall" color={Colors.textMuted} style={styles.bioText}>
          {USER_PROFILE.bio}
        </Text>

        <View style={styles.tabRow}>
          {TABS.map((tab, idx) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === idx && styles.tabActive]}
              onPress={() => setActiveTab(idx)}
            >
              <Text variant="body" weight={activeTab === idx ? 'bold' : 'regular'} color={activeTab === idx ? Colors.ink : Colors.text}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsRow}>
          {EVENTS.slice(0, 3).map((event) => (
            <EventCard
              key={event.id}
              image={event.image}
              title={event.title}
              type={event.category}
              price={`$${event.price}`}
              onPress={() => router.push(`/(app)/events/${event.id}`)}
            />
          ))}
        </ScrollView>

        <Button
          title="Switch to Creator Mode"
          variant="outline"
          onPress={switchToCreator}
          style={styles.switchButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerImageContainer: {
    width,
    height: 220,
    position: 'relative',
  },
  headerImage: {
    width,
    height: 220,
  },
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  settingsButton: {
    position: 'absolute',
    top: 56,
    right: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40,
    paddingHorizontal: Spacing.lg,
    paddingTop: 64,
    paddingBottom: 60,
    minHeight: 600,
  },
  avatarWrapper: {
    position: 'absolute',
    top: -52,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  roleText: {
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  bioTitle: {
    marginBottom: Spacing.sm,
  },
  bioText: {
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  eventsRow: {
    gap: 0,
    paddingBottom: 24,
  },
  switchButton: {
    marginTop: Spacing.xl,
  },
});
