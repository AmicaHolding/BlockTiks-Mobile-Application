import { View, StyleSheet, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, PressableCard, IconButton } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { useState } from 'react';

const MENU = [
  { label: 'Edit Profile', icon: 'person-outline', route: '/(app)/edit-profile' },
  { label: 'Change Password', icon: 'lock-closed-outline', route: '/(app)/change-password' },
  { label: 'Payment Options', icon: 'card-outline', route: '/(app)/payment-options' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/(app)/notifications' },
  { label: 'Privacy Policy', icon: 'shield-checkmark-outline', route: '/(app)/faqs' },
  { label: 'Terms & Conditions', icon: 'document-text-outline', route: '/(app)/faqs' },
];

export default function SettingsScreen() {
  const [biometric, setBiometric] = useState(false);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => router.back()} />
        <Text variant="heading2" weight="bold">
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.menu}>
        {MENU.map((item) => (
          <PressableCard
            key={item.label}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.menuLeft}>
              <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
              <Text variant="body" weight="medium" style={styles.menuLabel}>
                {item.label}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </PressableCard>
        ))}

        <PressableCard style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="finger-print-outline" size={22} color={Colors.primary} />
            <Text variant="body" weight="medium" style={styles.menuLabel}>
              Biometric Login
            </Text>
          </View>
          <Switch
            value={biometric}
            onValueChange={setBiometric}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </PressableCard>
      </View>

      <Text variant="caption" color={Colors.textMuted} center style={styles.version}>
        BlockTiks v1.0.10
      </Text>
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
  menu: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    marginLeft: 12,
  },
  version: {
    marginTop: 24,
  },
});
