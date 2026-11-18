import { Button, EmptyState } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        title="Page not found"
        body="The page you're looking for doesn't exist or may have moved."
        action={<Button to="/">Back to overview</Button>}
      />
    </div>
  );
}
