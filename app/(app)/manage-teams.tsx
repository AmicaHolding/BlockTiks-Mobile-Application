import { FeatureScreen } from '@/components/ui';

export default function ManageTeamsScreen() {
  return (
    <FeatureScreen
      title="Manage Teams"
      icon="people-outline"
      description="Invite staff and assign roles to help run your events."
      inputLabel="New team name"
      placeholder="e.g. Box Office"
      buttonTitle="Create team"
      list={[
        { label: 'Box Office', sublabel: '4 members · checked in 120 guests' },
        { label: 'Stage Managers', sublabel: '2 members' },
        { label: 'Marketing', sublabel: '3 members' },
        { label: 'Security', sublabel: '8 members' },
      ]}
    />
  );
}
