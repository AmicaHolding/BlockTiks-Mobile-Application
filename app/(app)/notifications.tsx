import { View, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, PressableCard, IconButton } from '@/components/ui';
import { Colors } from '@/constants/Colors';

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Your ticket is confirmed',
    body: 'DJ MaksMellow Orignawa - General Admission',
    time: '2h ago',
    read: false,
  },
  {
    id: '2',
    title: 'Event reminder',
    body: 'NBA Finals: Game 4 starts in 24 hours.',
    time: '1d ago',
    read: true,
  },
  {
    id: '3',
    title: 'Refund processed',
    body: '$120 has been refunded to your wallet.',
    time: '2d ago',
    read: true,
  },
];

export default function NotificationsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => router.back()} />
        <Text variant="heading2" weight="bold">
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableCard style={[styles.notificationCard, !item.read && styles.unread]}>
            <View style={styles.iconBox}>
              <Ionicons
                name={item.read ? 'mail-open-outline' : 'mail-unread-outline'}
                size={22}
                color={item.read ? Colors.textMuted : Colors.primary}
              />
            </View>
            <View style={styles.textBlock}>
              <Text variant="body" weight={item.read ? 'regular' : 'semibold'}>
                {item.title}
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted} numberOfLines={2}>
                {item.body}
              </Text>
            </View>
            <Text variant="caption" color={Colors.textMuted}>
              {item.time}
            </Text>
          </PressableCard>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" color={Colors.textMuted} center>
              No notifications yet.
            </Text>
          </View>
        }
      />
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
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  unread: {
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
    marginRight: 8,
  },
  empty: {
    marginTop: 48,
  },
});
