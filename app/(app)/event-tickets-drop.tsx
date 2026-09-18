import { FeatureScreen } from '@/components/ui';

export default function EventTicketsDropScreen() {
  return (
    <FeatureScreen
      title="Ticket Drop"
      icon="ticket-outline"
      description="Schedule timed ticket releases and limited drops for your event."
      inputLabel="Drop name"
      placeholder="Early Bird Release"
      buttonTitle="Schedule drop"
      list={[
        { label: 'Early Bird', sublabel: 'Oct 1, 9:00 AM · 100 tickets' },
        { label: 'General Sale', sublabel: 'Oct 5, 10:00 AM · 500 tickets' },
      ]}
    />
  );
}
