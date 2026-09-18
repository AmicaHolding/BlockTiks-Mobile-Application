import { useEffect } from 'react';
import { Redirect } from 'expo-router';

export default function CreatorDashboardRedirect() {
  return <Redirect href="/(app)/creator" />;
}
