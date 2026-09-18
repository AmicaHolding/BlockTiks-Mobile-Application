import { FeatureScreen } from '@/components/ui';

export default function BroadcastMessageScreen() {
  return (
    <FeatureScreen
      title="Broadcast Message"
      icon="megaphone-outline"
      description="Send a notification to all ticket holders for an event."
      inputLabel="Message"
      placeholder="Doors open at 7 PM. Don't forget your ID."
      buttonTitle="Send broadcast"
      list={[
        { label: 'Past broadcasts', sublabel: '3 sent · 98% delivered' },
      ]}
    />
  );
}
