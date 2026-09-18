import { View, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, Card, PressableCard, IconButton, Button } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';

const MENU_ITEMS = [
  { label: 'Edit Profile', icon: 'person-outline', route: '/(app)/edit-profile' },
  { label: 'My Wallet', icon: 'wallet-outline', route: '/(app)/wallet' },
  { label: 'Creator Dashboard', icon: 'briefcase-outline', route: '/(app)/creator-dashboard' },
  { label: 'Manage Teams', icon: 'people-outline', route: '/(app)/manage-teams' },
  { label: 'Transactions', icon: 'receipt-outline', route: '/(app)/transactions' },
  { label: 'Referrals', icon: 'share-outline', route: '/(app)/referrals' },
  { label: 'Settings', icon: 'settings-outline', route: '/(app)/settings' },
  { label: 'Help & FAQs', icon: 'help-circle-outline', route: '/(app)/faqs' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading1" weight="bold">
          Profile
        </Text>
        <IconButton
          name="notifications-outline"
          onPress={() => router.push('/(app)/notifications')}
        />
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <Image
            source={{
              uri:
                user?.avatar ||
                'https://ui-avatars.com/api/?name=' +
                  encodeURIComponent(`${user?.firstName || 'User'} ${user?.lastName || ''}`) +
                  '&background=E91E63&color=fff',
            }}
            style={styles.avatar}
          />
          <View style={styles.nameBlock}>
            <Text variant="heading3" weight="bold">
              {user?.firstName || 'Block'} {user?.lastName || 'Tiks'}
            </Text>
            <Text variant="bodySmall" color={Colors.textMuted}>
              {user?.email || 'user@example.com'}
            </Text>
            <Text variant="caption" color={Colors.primary} weight="semibold">
              {user?.role === 'creator' ? 'Event Creator' : 'Event Goer'}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text variant="heading2" weight="bold" center>
            12
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted} center>
            Tickets
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="heading2" weight="bold" center>
            $240
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted} center>
            Wallet
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="heading2" weight="bold" center>
            4
          </Text>
          <Text variant="bodySmall" color={Colors.textMuted} center>
            Events
          </Text>
        </Card>
      </View>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <PressableCard
            key={item.label}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.menuItemInner}>
              <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
              <Text variant="body" weight="medium" style={styles.menuLabel}>
                {item.label}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </PressableCard>
        ))}
      </View>

      <Button title="Log Out" variant="secondary" onPress={handleLogout} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileCard: {
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
  },
  nameBlock: {
    marginLeft: 16,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  menu: {
    gap: 8,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    marginLeft: 12,
  },
  logout: {
    marginBottom: 24,
  },
});
