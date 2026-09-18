import { FeatureScreen } from '@/components/ui';

export default function SetDateScreen() {
  return (
    <FeatureScreen
      title="Set Date"
      icon="calendar-outline"
      description="Pick the date and time for your event."
      inputLabel="Event date & time"
      placeholder="April 20, 2024 at 8:00 PM"
      buttonTitle="Confirm date"
    />
  );
}
