import { FeatureScreen } from '@/components/ui';

export default function AddIndividualScreen() {
  return (
    <FeatureScreen
      title="Add Individual"
      icon="person-add-outline"
      description="Add a single person to a team or guest list."
      inputLabel="Name"
      placeholder="John Doe"
      buttonTitle="Add Individual"
    />
  );
}
