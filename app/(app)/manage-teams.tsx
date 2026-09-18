import { FeatureScreen } from '@/components/ui';

export default function ManageTeamsScreen() {
  return (
    <FeatureScreen
      title="Manage Teams"
      icon="people-outline"
      description="Invite staff and assign roles to help run your events."
      list={['Box Office Team', 'Stage Managers', 'Marketing Team', 'Security']}
      buttonTitle="Add Team Member"
    />
  );
}
