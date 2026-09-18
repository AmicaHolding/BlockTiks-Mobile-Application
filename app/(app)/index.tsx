import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function AppIndex() {
  const { user, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  const isCreator = user?.role === 'creator';
  return <Redirect href={isCreator ? '/(app)/creator' : '/(app)/user'} />;
}
