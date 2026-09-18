import { router } from 'expo-router';
import { FeatureScreen } from '@/components/ui';

export default function MyScannerScreen() {
  return (
    <FeatureScreen
      title="Entry Scanner"
      icon="qr-code-outline"
      description="Scan tickets at the gate for fast, fraud-free check-in."
      buttonTitle="Open Scanner"
      onAction={() => router.push('/(app)/scanner')}
    />
  );
}
