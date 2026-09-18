import { FeatureScreen } from '@/components/ui';

export default function PromoCodesScreen() {
  return (
    <FeatureScreen
      title="Promo Codes"
      icon="pricetag-outline"
      description="Create discount codes and track redemptions."
      inputLabel="Discount code"
      placeholder="SUMMER20"
      buttonTitle="Create code"
      list={[
        { label: 'EARLYBIRD', sublabel: '20% off · 34 used' },
        { label: 'VIP2024', sublabel: '$50 off · 12 used' },
      ]}
    />
  );
}
