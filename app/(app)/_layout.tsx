import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="events/create" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="scanner" />
      {/* Placeholder modules */}
      <Stack.Screen name="creator-dashboard" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="manage-teams" />
      <Stack.Screen name="venue-layout" />
      <Stack.Screen name="promo-codes" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="withdraw" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="faqs" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="payment-options" />
      <Stack.Screen name="payment-page" />
      <Stack.Screen name="send-tickets" />
      <Stack.Screen name="transfer" />
      <Stack.Screen name="place-bid" />
      <Stack.Screen name="ask-bid" />
      <Stack.Screen name="broadcast-message" />
      <Stack.Screen name="upcoming-event" />
      <Stack.Screen name="media-preview" />
    </Stack>
  );
}
