import { FeatureScreen } from '@/components/ui';

export default function VenueLayoutScreen() {
  return (
    <FeatureScreen
      title="Venue Layout"
      icon="grid-outline"
      description="Upload or configure the seating plan for your venue."
      inputLabel="Layout Name"
      placeholder="e.g. Main Floor - Theater"
      buttonTitle="Save Layout"
    />
  );
}
