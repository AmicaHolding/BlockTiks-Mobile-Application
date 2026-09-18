import { FeatureScreen } from '@/components/ui';

export default function ReferralsScreen() {
  return (
    <FeatureScreen
      title="Referrals"
      icon="share-social-outline"
      description="Invite friends and earn credits when they buy their first ticket."
      list={[
        { label: 'Your referral code', sublabel: 'BLOCK123' },
        { label: 'Credits earned', sublabel: '$45' },
        { label: 'Friends joined', sublabel: '9' },
      ]}
      buttonTitle="Share Invite"
    />
  );
}
