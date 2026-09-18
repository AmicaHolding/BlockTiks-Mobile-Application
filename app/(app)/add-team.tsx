import { FeatureScreen } from '@/components/ui';

export default function AddTeamScreen() {
  return (
    <FeatureScreen
      title="Add Team"
      icon="people-outline"
      description="Create a new team for your event operations."
      inputLabel="Team Name"
      placeholder="Box Office"
      buttonTitle="Create Team"
    />
  );
}
