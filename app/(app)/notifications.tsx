import { View, StyleSheet, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Screen, AppHeader, PressableCard } from '@/components/ui';
import { Colors, Spacing, Radius } from '@/constants/Colors';
import { EVENTS } from '@/services/data';

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Your ticket is confirmed',
    body: 'DJ MaksMellow Orignawa - General Admission',
    time: '2h ago',
    read: false,
    image: EVENTS[0].image,
  },
  {
    id: '2',
    title: 'Event reminder',
    body: 'NBA Finals: Game 4 starts in 24 hours.',
    time: '1d ago',
    read: true,
    image: EVENTS[1].image,
  },
  {
    id: '3',
    title: 'Refund processed',
    body: '$120 has been refunded to your wallet.',
    time: '2d ago',
    read: true,
    image: null,
  },
];

export default function NotificationsScreen() {
  return (
    <Screen>
      <AppHeader title="Notifications" showBack />

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableCard
            variant="pressed"
            style={[styles.card, !item.read && styles.unread]}
          >
            <View style={styles.iconBox}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <Ionicons name="wallet-outline" size={22} color={item.read ? Colors.textMuted : Colors.primary} />
              )}
            </View>
            <View style={styles.textBlock}>
              <Text variant="bodySmall" weight={item.read ? 'regular' : 'bold'}>
                {item.title}
              </Text>
              <Text variant="caption" color={Colors.textMuted} numberOfLines={2}>
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
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  unread: {
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  image: {
    width: 48,
    height: 48,
  },
  textBlock: {
    flex: 1,
    marginRight: 8,
  },
  empty: {
    marginTop: 48,
  },
});
