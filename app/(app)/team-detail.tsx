import { FeatureScreen } from '@/components/ui';

export default function TeamDetailScreen() {
  return (
    <FeatureScreen
      title="Team Detail"
      icon="people-circle-outline"
      description="View team members and assigned responsibilities."
      list={['Manager: Jane Doe', 'Scanner: Mike Smith', 'Support: Anna Lee']}
      buttonTitle="Manage Members"
    />
  );
}
