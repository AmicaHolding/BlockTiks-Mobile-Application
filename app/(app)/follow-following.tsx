import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, PressableCard } from '@/components/ui';
import { Colors, Spacing } from '@/constants/Colors';

const USERS = [
  { id: '1', name: 'Alex Morgan', handle: '@alexm' },
  { id: '2', name: 'Sarah Lee', handle: '@slee' },
  { id: '3', name: 'DJ Khaled', handle: '@djkhaled' },
];

export default function FollowFollowingScreen() {
  return (
    <Screen>
      <AppHeader title="Followers" showBack />
      {USERS.map((user) => (
        <PressableCard key={user.id} variant="pressed" style={styles.row}>
          <View style={styles.avatar}>
            <Text variant="bodySmall" weight="bold">{user.name.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text variant="bodySmall" weight="bold">{user.name}</Text>
            <Text variant="caption" color={Colors.textMuted}>{user.handle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </PressableCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
});
