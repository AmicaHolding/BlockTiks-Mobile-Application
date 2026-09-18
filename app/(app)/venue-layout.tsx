import { FeatureScreen } from '@/components/ui';

export default function VenueLayoutScreen() {
  return (
    <FeatureScreen
      title="Venue Layout"
      icon="grid-outline"
      description="Upload or configure the seating plan for your venue."
      inputLabel="Layout name"
      placeholder="Main Floor - Theater"
      buttonTitle="Save layout"
      list={[
        { label: 'Main Floor', sublabel: '250 seats' },
        { label: 'Balcony', sublabel: '80 seats' },
        { label: 'VIP Section', sublabel: '40 seats' },
      ]}
    />
  );
}
