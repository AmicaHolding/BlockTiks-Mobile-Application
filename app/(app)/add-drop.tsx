import { FeatureScreen } from '@/components/ui';

export default function AddDropScreen() {
  return (
    <FeatureScreen
      title="Add Drop"
      icon="download-outline"
      description="Add a new ticket tier or limited release."
      inputLabel="Drop Name"
      placeholder="VIP Backstage"
      buttonTitle="Add Drop"
    />
  );
}
