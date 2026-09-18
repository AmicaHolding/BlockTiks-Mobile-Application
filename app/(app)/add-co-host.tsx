import { FeatureScreen } from '@/components/ui';

export default function AddCoHostScreen() {
  return (
    <FeatureScreen
      title="Add Co-Host"
      icon="person-add-outline"
      description="Invite a co-host to help manage this event."
      inputLabel="Email or username"
      placeholder="cohost@example.com"
      buttonTitle="Send invite"
      list={[
        { label: 'Existing co-hosts', sublabel: '2 active co-hosts' },
      ]}
    />
  );
}
