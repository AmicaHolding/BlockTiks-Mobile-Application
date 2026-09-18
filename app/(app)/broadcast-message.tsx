import { FeatureScreen } from '@/components/ui';

export default function BroadcastMessageScreen() {
  return (
    <FeatureScreen
      title="Broadcast Message"
      icon="megaphone-outline"
      description="Send a notification to all ticket holders for an event."
      inputLabel="Message"
      placeholder="Type your announcement..."
      buttonTitle="Send Broadcast"
    />
  );
}
