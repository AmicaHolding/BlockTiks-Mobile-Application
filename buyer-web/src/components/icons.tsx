type IconProps = { size?: number; className?: string };

function base(size = 18, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
}

export function SearchIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function PinIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function ChevronDownIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function GlobeIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </svg>
  );
}

export function CalendarIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function ClockIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function TicketIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 9V7a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 6v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-6z" />
      <path d="M13 5v2M13 11v2M13 17v2" />
    </svg>
  );
}

export function ShareIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </svg>
  );
}

export function BookmarkIcon({ size, className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size, className)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
    </svg>
  );
}

export function ArrowLeftIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function CheckIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function PlusIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MinusIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function UsersIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5 6.5-5s5.7 1.5 6.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.5c2.6.3 4.4 1.8 5 4.5" />
    </svg>
  );
}

export function SendIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function CashIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 10v4M18 10v4" />
    </svg>
  );
}

export function LogoutIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function CardIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function BellIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}

export function ShieldIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function HelpIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function ReceiptIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function TagIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 12l9-9h9v9l-9 9-9-9z" />
      <circle cx="16.5" cy="7.5" r="1.5" />
    </svg>
  );
}

export function FireIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 22c4.4 0 7-2.8 7-6.5 0-3-2-5-3.5-7C14 7 13 5 13 3c-3 2-4.5 4.5-4.5 7 0 0-1.5-1-2-3-1 2-1.5 4-1.5 6C5 19.2 7.6 22 12 22z" />
    </svg>
  );
}

export function MapIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
