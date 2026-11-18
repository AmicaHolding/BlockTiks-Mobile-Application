import { useEffect, type ReactNode } from 'react';

export default function Modal({
  onClose,
  children,
  label,
  wide = false,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-card bg-sand p-6 text-ink shadow-2xl sm:rounded-card sm:p-8 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-dune text-ink/70 hover:text-ink"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
