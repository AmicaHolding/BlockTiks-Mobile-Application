import { FeatureScreen } from '@/components/ui';

export default function TeamDetailScreen() {
  return (
    <FeatureScreen
      title="Team Detail"
      icon="people-circle-outline"
      description="View team members and assigned responsibilities."
      inputLabel="Add member email"
      placeholder="teammate@example.com"
      buttonTitle="Invite member"
      list={[
        { label: 'Jane Doe', sublabel: 'Manager' },
        { label: 'Mike Smith', sublabel: 'Scanner' },
        { label: 'Anna Lee', sublabel: 'Support' },
      ]}
    />
  );
}
