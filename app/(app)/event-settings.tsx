import { useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, PressableCard, Button } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';
import { haptic } from '@/services/haptics';

const SETTINGS = [
  { key: 'public', label: 'Public event', description: 'Visible in search and discovery', default: true },
  { key: 'refunds', label: 'Allow refunds', description: 'Guests can request refunds until 24h before', default: true },
  { key: 'transfer', label: 'Allow ticket transfers', description: 'Guests can send tickets to friends', default: true },
  { key: 'resale', label: 'Allow resale', description: 'Guests can list tickets on the marketplace', default: false },
];

export default function EventSettingsScreen() {
  const [values, setValues] = useState<Record<string, boolean>>({
    public: true,
    refunds: true,
    transfer: true,
    resale: false,
  });

  return (
    <Screen>
      <AppHeader title="Event Settings" showBack />

      <View style={styles.list}>
        {SETTINGS.map((setting) => (
          <PressableCard key={setting.key} variant="pressed" style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="settings-outline" size={20} color={Colors.primaryBright} />
            </View>
            <View style={styles.rowText}>
              <Text variant="body" weight="medium">{setting.label}</Text>
              <Text variant="caption" color={Colors.textMuted}>{setting.description}</Text>
            </View>
            <Switch
              value={values[setting.key]}
              onValueChange={(val) => {
                haptic.light();
                setValues((prev) => ({ ...prev, [setting.key]: val }));
              }}
              trackColor={{ false: Colors.backgroundElevated, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </PressableCard>
        ))}
      </View>

      <Button
        title="Save settings"
        onPress={() => {
          haptic.success();
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    marginRight: 8,
  },
});
