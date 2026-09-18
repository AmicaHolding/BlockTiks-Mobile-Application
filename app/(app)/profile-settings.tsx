import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Screen,
  AppHeader,
  PressableCard,
  useToast,
} from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { StyleSheet, View } from 'react-native';

const LINKS = [
  { label: 'Edit Profile', icon: 'person-outline', route: '/(app)/edit-profile' },
  { label: 'Change Password', icon: 'lock-closed-outline', route: '/(app)/change-password' },
  { label: 'Payment Options', icon: 'card-outline', route: '/(app)/payment-options' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/(app)/notifications' },
  { label: 'Help & FAQs', icon: 'help-circle-outline', route: '/(app)/faqs' },
];

export default function ProfileSettingsScreen() {
  const { logout } = useAuthStore();
  const { show } = useToast();

  const handleLogout = async () => {
    await logout();
    show('Logged out', 'success');
    router.replace('/(auth)');
  };

  return (
    <Screen>
      <AppHeader title="Settings" showBack />

      <View style={styles.menu}>
        {LINKS.map((item) => (
          <PressableCard
            key={item.label}
            variant="pressed"
            style={styles.row}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
              <Text variant="bodySmall" weight="medium" style={styles.label}>
                {item.label}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </PressableCard>
        ))}
      </View>

      <PressableCard variant="pressed" style={styles.logout} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={Colors.error} />
        <Text variant="bodySmall" weight="bold" color={Colors.error} style={styles.label}>
          Log Out
        </Text>
      </PressableCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  menu: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    marginLeft: 12,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    paddingVertical: 14,
  },
});
