import { FeatureScreen } from '@/components/ui';

export default function ReferralsScreen() {
  return (
    <FeatureScreen
      title="Referrals"
      icon="share-social-outline"
      description="Invite friends and earn credits when they buy their first ticket."
      list={['Your referral code: BLOCK123', 'Credits earned: $45', 'Friends joined: 9']}
      buttonTitle="Share Invite"
    />
  );
}
