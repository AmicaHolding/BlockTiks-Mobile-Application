import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { STUDIO_URL } from '../lib/config';
import Modal from './Modal';

type HostMode = 'who' | 'personal' | 'public';

interface HostState {
  /** "+ Host" (web prototype): Who's it for → personal invite or Studio. */
  openHost: (mode?: HostMode) => void;
}

const HostContext = createContext<HostState | null>(null);

export function inviteLink(code: string): string {
  return `${window.location.origin}/i/${code}`;
}

function WhoModal({ onPersonal, onClose }: { onPersonal: () => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose} label="Who's it for?">
      <div className="font-display text-2xl font-extrabold">Who’s it for?</div>
      <p className="mt-1 text-sm text-ink/60">It’s about who can come, not how big it is.</p>
      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={onPersonal}
          className="block w-full rounded-card border border-ink/15 bg-white p-5 text-start transition hover:border-night"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">Hosted by you</span>
          <div className="mt-1 font-display text-lg font-extrabold">People I invite</div>
          <div className="text-sm text-ink/60">Free. Share a link, people RSVP.</div>
        </button>
        <a
          href={STUDIO_URL}
          className="block w-full rounded-card border border-ink/15 bg-white p-5 text-start transition hover:border-night"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">Hosted by an organisation</span>
          <div className="mt-1 font-display text-lg font-extrabold">Anyone, with tickets</div>
          <div className="text-sm text-ink/60">Build and sell in Sahra Studio.</div>
        </a>
      </div>
    </Modal>
  );
}

export function HostProvider({ children }: { children: ReactNode }) {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState<'who' | null>(null);

  const goPersonal = useCallback(
    () => requireAuth('host', () => navigate('/new-invite')),
    [requireAuth, navigate]
  );

  const openHost = useCallback(
    (mode: HostMode = 'who') => {
      if (mode === 'public') {
        window.location.href = STUDIO_URL;
        return;
      }
      if (mode === 'personal') goPersonal();
      else setOpen('who');
    },
    [goPersonal]
  );

  return (
    <HostContext.Provider value={{ openHost }}>
      {children}
      {open === 'who' ? (
        <WhoModal
          onClose={() => setOpen(null)}
          onPersonal={() => {
            setOpen(null);
            goPersonal();
          }}
        />
      ) : null}
    </HostContext.Provider>
  );
}

export function useHost(): HostState {
  const ctx = useContext(HostContext);
  if (!ctx) throw new Error('useHost must be used within HostProvider');
  return ctx;
}
