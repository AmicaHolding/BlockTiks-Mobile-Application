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

type Tone = 'dark' | 'light';

export function Button({
  variant = 'primary',
  tone = 'dark',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'gold' | 'night' | 'ghost' | 'danger' | 'outline';
  tone?: Tone;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants: Record<string, string> = {
    primary: 'bg-gold text-night hover:brightness-95',
    gold: 'bg-gold text-night hover:brightness-95',
    night: 'bg-night text-sand hover:bg-night-elevated',
    ghost: tone === 'light' ? 'bg-dune/70 text-ink hover:bg-dune' : 'bg-night-surface text-sand hover:bg-night-elevated',
    danger: 'bg-rumman text-sand hover:brightness-95',
    outline:
      tone === 'light'
        ? 'border border-ink/20 text-ink hover:bg-dune/60'
        : 'border border-night-border text-sand hover:bg-night-surface',
  };
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

export function Card({
  children,
  className,
  tone = 'dark',
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  const styles =
    tone === 'light'
      ? 'border border-ink/10 bg-white shadow-sm'
      : 'border border-night-border/60 bg-night-surface';
  return <div className={cx('rounded-2xl', styles, className)}>{children}</div>;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'gold' | 'green' | 'red' | 'muted';
}) {
  const tones = {
    neutral: 'bg-night-elevated text-sand',
    gold: 'bg-gold/25 text-gold',
    green: 'bg-emerald-400/15 text-emerald-300',
    red: 'bg-rumman/20 text-red-200',
    muted: 'bg-night-border/50 text-night-muted',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', tones[tone])}>
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

const controlDark =
  'w-full rounded-xl border border-night-border bg-night-surface px-3.5 py-2.5 text-sm text-sand outline-none transition placeholder:text-night-muted focus:border-gold focus:ring-2 focus:ring-gold/30';
const controlLight =
  'w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-night focus:ring-2 focus:ring-gold/40';

export function Input({
  tone = 'light',
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { tone?: Tone }) {
  return <input className={cx(tone === 'light' ? controlLight : controlDark, className)} {...props} />;
}

export function Textarea({
  tone = 'light',
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { tone?: Tone }) {
  return (
    <textarea
      className={cx(tone === 'light' ? controlLight : controlDark, 'min-h-24 resize-y', className)}
      {...props}
    />
  );
}

export function Select({
  tone = 'light',
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { tone?: Tone }) {
  return (
    <select className={cx(tone === 'light' ? controlLight : controlDark, 'appearance-none', className)} {...props}>
      {children}
    </select>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent',
        className
      )}
    />
  );
}

export function EmptyState({
  title,
  children,
  tone = 'dark',
}: {
  title: string;
  children?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card tone={tone} className="p-8 text-center">
      <div className={cx('font-display text-lg font-bold', tone === 'light' ? 'text-ink' : 'text-sand')}>
        {title}
      </div>
      {children ? (
        <div className={cx('mt-2 text-sm', tone === 'light' ? 'text-ink/60' : 'text-night-muted')}>{children}</div>
      ) : null}
    </Card>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  tone = 'dark',
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</div>
        ) : null}
        <h1
          className={cx(
            'mt-1 font-display text-3xl font-extrabold tracking-tight',
            tone === 'light' ? 'text-ink' : 'text-sand'
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className={cx('mt-1 text-sm', tone === 'light' ? 'text-ink/60' : 'text-night-muted')}>{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
