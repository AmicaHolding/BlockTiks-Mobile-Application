import { FeatureScreen } from '@/components/ui';

export default function EventTicketsDropScreen() {
  return (
    <FeatureScreen
      title="Ticket Drop"
      icon="ticket-outline"
      description="Schedule timed ticket releases and limited drops for your event."
      inputLabel="Drop Name"
      placeholder="Early Bird Release"
      buttonTitle="Schedule Drop"
    />
  );
}
