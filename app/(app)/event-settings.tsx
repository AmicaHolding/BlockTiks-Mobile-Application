import { FeatureScreen } from '@/components/ui';

export default function EventSettingsScreen() {
  return (
    <FeatureScreen
      title="Event Settings"
      icon="settings-outline"
      description="Configure visibility, refund policy, and guest permissions for your event."
      list={['Public / Private', 'Refund policy', 'Guest check-in settings', 'Co-host permissions']}
      buttonTitle="Save Settings"
    />
  );
}
