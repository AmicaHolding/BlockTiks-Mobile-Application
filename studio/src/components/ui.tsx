import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    primary: 'bg-night text-sand hover:bg-night-elevated',
    gold: 'bg-gold text-night hover:brightness-95',
    ghost: 'bg-dune text-ink hover:bg-night-border/20',
    danger: 'bg-rumman text-sand hover:brightness-95',
  };
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-2xl border border-night-border/60 bg-white/70 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'green' | 'red' | 'draft' }) {
  const tones = {
    neutral: 'bg-dune text-ink',
    gold: 'bg-gold/30 text-night',
    green: 'bg-emerald-100 text-emerald-900',
    red: 'bg-rumman/10 text-rumman',
    draft: 'bg-night-muted/20 text-night',
  };
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

const control =
  'w-full rounded-xl border border-night-border/70 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-night-muted focus:border-night focus:ring-2 focus:ring-gold/40';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(control, 'min-h-28 resize-y', props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(control, 'appearance-none', props.className)} {...props} />;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-night-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-ink">{value}</div>
      {hint ? <div className="mt-1 text-xs text-night-muted">{hint}</div> : null}
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="p-8 text-center">
      <div className="font-display text-lg font-bold text-ink">{title}</div>
      {children ? <div className="mt-2 text-sm text-night-muted">{children}</div> : null}
    </Card>
  );
}
