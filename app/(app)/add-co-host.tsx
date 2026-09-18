import { FeatureScreen } from '@/components/ui';

export default function AddCoHostScreen() {
  return (
    <FeatureScreen
      title="Add Co-Host"
      icon="person-add-outline"
      description="Invite a co-host to help manage this event."
      inputLabel="Email or Username"
      placeholder="cohost@example.com"
      buttonTitle="Send Invite"
    />
  );
}
