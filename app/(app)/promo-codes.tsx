import { FeatureScreen } from '@/components/ui';

export default function PromoCodesScreen() {
  return (
    <FeatureScreen
      title="Promo Codes"
      icon="pricetag-outline"
      description="Create discount codes and track redemptions."
      inputLabel="Code"
      placeholder="SUMMER20"
      buttonTitle="Create Promo Code"
    />
  );
}
