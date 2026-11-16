import type { ReactNode } from 'react';
import { Card, EmptyState } from '../components/ui';

export default function PlaceholderPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-night-muted">Studio</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">{title}</h1>
      </div>
      <Card>
        <EmptyState title={`${title} is not designed yet`}>
          {children ?? 'This surface is still being specced. The events flow is the first Studio pass.'}
        </EmptyState>
      </Card>
    </div>
  );
}
