import { FeatureScreen } from '@/components/ui';

export default function CreatorPromoCodeScreen() {
  return (
    <FeatureScreen
      title="Creator Promo Code"
      icon="pricetag-outline"
      description="Create exclusive promo codes for your events and track usage."
      inputLabel="Discount Code"
      placeholder="FANS20"
      buttonTitle="Create Code"
    />
  );
}
