import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold text-night">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-ink/60">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-dune bg-white p-6 shadow-[0_1px_2px_rgba(22,38,59,0.04)] ${className}`}
    >
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function NightCard({
  title,
  children,
  action,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-night bg-night p-6 text-sand ${className}`}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-sand/50">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = 'primary',
  href,
  to,
  loading,
  disabled,
  onClick,
  type = 'button',
  small,
}: {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'dark';
  href?: string;
  to?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  small?: boolean;
}) {
  const base = `inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors ${
    small ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'
  }`;
  const styles: Record<string, string> = {
    primary: 'bg-gold text-ink hover:bg-gold/90',
    outline: 'border border-ink/15 text-ink hover:border-ink/30',
    ghost: 'text-ink/60 hover:text-ink',
    danger: 'bg-rumman text-white hover:bg-rumman/90',
    dark: 'bg-night text-sand hover:bg-night/90',
  };
  const cls = `${base} ${styles[variant]} ${
    disabled || loading ? 'cursor-not-allowed opacity-50' : ''
  }`;

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} onClick={onClick}>
      {loading ? 'Working…' : children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode;
  tone?: 'default' | 'gold' | 'night' | 'danger' | 'outline';
  className?: string;
}) {
  const styles: Record<string, string> = {
    default: 'bg-dune text-ink/70',
    gold: 'bg-gold text-ink',
    night: 'bg-night text-sand',
    danger: 'bg-rumman/10 text-rumman',
    outline: 'border border-ink/15 text-ink/60',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${styles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Chip({
  children,
  selected,
  onClick,
  tone = 'default',
  className = '',
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  className?: string;
}) {
  const off =
    tone === 'danger'
      ? 'border-ink/15 text-ink/60 hover:border-ink/30'
      : 'border-ink/15 text-ink/60 hover:border-ink/30';
  const on =
    tone === 'danger'
      ? 'border-rumman bg-rumman/10 text-rumman'
      : 'border-ink bg-ink text-sand';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        selected ? on : off
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dune bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-night tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink/15 bg-white/60 p-10 text-center">
      <p className="font-display text-lg font-bold text-night">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  error,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-rumman">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink/45">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 ${className}`}
      {...rest}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      className={`w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 ${className}`}
      {...rest}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return (
    <select
      className={`w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 ${className}`}
      {...rest}
    />
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-lg border border-ink/15 bg-white ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3 py-1.5 text-sm font-bold text-ink/60 hover:text-ink disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-3 py-1.5 text-sm font-bold text-ink/60 hover:text-ink disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay primitives
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-sand p-7 shadow-2xl ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-night">{title}</h2>
            {sub ? <p className="mt-1.5 text-sm text-ink/55">{sub}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6 flex items-center justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep as is
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink/70">{body}</div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

export interface Toast {
  id: number;
  text: string;
  tone?: 'default' | 'danger';
}

export function useToasts(): { toasts: Toast[]; push: (text: string, tone?: Toast['tone']) => void } {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (text: string, tone: Toast['tone'] = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };
  return { toasts, push };
}

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-pill px-5 py-2.5 text-sm font-semibold shadow-lg ${
            t.tone === 'danger' ? 'bg-rumman text-white' : 'bg-night text-sand'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-ink/50">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-gold" />
      {label}
    </div>
  );
}

export function VerificationBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <Badge tone="gold">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Verified organiser
      </Badge>
    );
  }
  if (status === 'submitted') return <Badge tone="outline">Verification in review</Badge>;
  if (status === 'rejected') return <Badge tone="danger">Verification rejected</Badge>;
  return <Badge tone="outline">Not verified</Badge>;
}
