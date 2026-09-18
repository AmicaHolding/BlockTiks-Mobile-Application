import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';

export default function AppLayout() {
  const { token, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.replace('/(auth)');
    }
  }, [isHydrated, token, router]);

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!token) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="user" options={{ animation: 'fade' }} />
      <Stack.Screen name="creator" options={{ animation: 'fade' }} />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="events/[id]/tickets" />
      <Stack.Screen name="events/create" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="creator-dashboard" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="faqs" />
      <Stack.Screen name="payment-options" />
      <Stack.Screen name="payment-page" />
      <Stack.Screen name="send-tickets" />
      <Stack.Screen name="transfer" />
      <Stack.Screen name="place-bid" />
      <Stack.Screen name="ask-bid" />
      <Stack.Screen name="broadcast-message" />
      <Stack.Screen name="upcoming-event" />
      <Stack.Screen name="media-preview" />
      <Stack.Screen name="manage-teams" />
      <Stack.Screen name="venue-layout" />
      <Stack.Screen name="promo-codes" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="withdraw" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="purchased-ticket" />
      <Stack.Screen name="other-user-profile" />
      <Stack.Screen name="follow-following" />
      <Stack.Screen name="profile-settings" />
      <Stack.Screen name="search" />
      <Stack.Screen name="creator-promo-code" />
      <Stack.Screen name="event-settings" />
      <Stack.Screen name="event-tickets-drop" />
      <Stack.Screen name="add-co-host" />
      <Stack.Screen name="set-date" />
      <Stack.Screen name="add-drop" />
      <Stack.Screen name="add-team" />
      <Stack.Screen name="add-individual" />
      <Stack.Screen name="team-detail" />
      <Stack.Screen name="creator-event" />
      <Stack.Screen name="my-scanner" />
      <Stack.Screen name="all-guests" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
