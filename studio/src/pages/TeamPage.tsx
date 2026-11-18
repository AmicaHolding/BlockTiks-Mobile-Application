import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type StudioEvent } from '../lib/api';
import { useOrg } from '../lib/org';
import type { LocalMember, OrgRole } from '../lib/store';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  ToastHost,
  useToasts,
  Modal,
} from '../components/ui';

const ROLE_INFO: { role: OrgRole; title: string; blurb: string }[] = [
  { role: 'admin', title: 'Admin', blurb: 'Everything, events, money, team.' },
  { role: 'cohost', title: 'Co-host', blurb: 'Events and orders. No payouts or team.' },
  { role: 'gate', title: 'Gate staff', blurb: 'Scanning only, on the door app.' },
];

export default function TeamPage() {
  const { org } = useOrg();
  return (
    <div>
      <PageHeader title="Team" />
      {org ? <TeamPanel /> : null}
    </div>
  );
}

export function TeamPanel() {
  const { org, user } = useOrg();
  const navigate = useNavigate();
  const { toasts, push } = useToasts();
  const [members, setMembers] = useState<LocalMember[]>([]);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('cohost');
  const [gateEvents, setGateEvents] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState('');

  const reload = () => {
    if (!org) return;
    setMembers(api.members(org.id));
  };

  useEffect(() => {
    reload();
    api.myEvents().then(({ events }) => setEvents(events)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  const activeAdmins = useMemo(
    () => members.filter((m) => m.role === 'admin' && m.status === 'active'),
    [members],
  );

  if (!org) return null;
  const verified = org.verificationStatus === 'approved';

  function invite() {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setInviteError('Enter a valid email.');
      return;
    }
    const res = api.inviteMember(org!.id, {
      email: clean,
      role,
      eventScope: role === 'gate' && gateEvents.length > 0 ? gateEvents : null,
    });
    if ('error' in res && res.error === 'already_member') {
      setInviteError("They're already on this team.");
      return;
    }
    setInviteOpen(false);
    setEmail('');
    setRole('cohost');
    setGateEvents([]);
    setInviteError('');
    reload();
    push('Invite sent. It expires in 7 days.'); // TODO(decision-12)
  }

  function remove(m: LocalMember) {
    const res = api.removeMember(org!.id, m.id);
    if ('error' in res && res.error === 'last_admin') {
      push("You're the last admin. Make someone else admin first.", 'danger');
      return;
    }
    reload();
    push(m.status === 'invited' ? 'Invite pulled back.' : 'Removed.');
  }

  function changeRole(m: LocalMember, r: OrgRole) {
    const res = api.updateMember(org!.id, m.id, { role: r });
    if (res && 'error' in res && res.error === 'last_admin') {
      push("You're the last admin. Make someone else admin first.", 'danger');
      return;
    }
    reload();
  }

  return (
    <>
      {!verified ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/50 bg-gold/10 px-5 py-3.5 text-sm text-ink/70">
          <span>
            {org.verificationStatus === 'submitted'
              ? 'Verification is still in review, invites unlock once you are approved.'
              : 'Verify your organisation before inviting people.'}
          </span>
          <Button small variant="outline" onClick={() => navigate('/settings')}>
            Go to Settings
          </Button>
        </div>
      ) : null}

      <Card
        title="Team"
        action={
          <Button small onClick={() => setInviteOpen(true)} disabled={!verified}>
            + Invite
          </Button>
        }
      >
        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/45">No members yet.</p>
        ) : (
          <div className="-mx-2 divide-y divide-dune/70">
            {members.map((m) => {
              const isYou = m.email.toLowerCase() === user.email.toLowerCase();
              const lastAdmin =
                m.role === 'admin' && m.status === 'active' && activeAdmins.length <= 1;
              return (
                <div key={m.id} className="flex items-center gap-4 px-2 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dune font-display text-sm font-bold text-ink/60">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {m.name}
                      {isYou ? <span className="ml-2 text-xs font-normal text-ink/40">You</span> : null}
                    </p>
                    <p className="truncate text-xs text-ink/45">{m.email}</p>
                    {m.role === 'gate' && m.eventScope?.length ? (
                      <p className="text-[11px] text-ink/40">
                        Scoped to {m.eventScope.length} event{m.eventScope.length > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>
                  {m.status === 'invited' ? (
                    <Badge tone="outline">Invite pending</Badge>
                  ) : m.status === 'expired' ? (
                    <Badge tone="danger">Expired</Badge>
                  ) : null}
                  {m.status === 'active' && !m.you ? (
                    <Select
                      className="!w-32 !py-1.5 text-xs"
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value as OrgRole)}
                    >
                      {ROLE_INFO.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.title}
                        </option>
                      ))}
                    </Select>
                  ) : m.you ? (
                    <Badge tone="night">Admin</Badge>
                  ) : (
                    <Badge tone="outline">{ROLE_INFO.find((r) => r.role === m.role)?.title}</Badge>
                  )}
                  {!isYou && !lastAdmin ? (
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      className="text-xs font-semibold text-ink/40 underline underline-offset-2 hover:text-rumman"
                    >
                      {m.status === 'invited' || m.status === 'expired' ? 'Pull back' : 'Remove'}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* TODO(api-gap): POST /orgs/{id}/members {email,role,event_scope},           errors org_unverified, already_member. Invite email+expiry+reminder:
          TODO(decision-12) */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={`Invite to ${org.name}`}
        sub="They'll join with their own Sahra account, the invite goes to this email."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Not yet
            </Button>
            <Button onClick={invite}>Send invite</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Their email" error={inviteError}>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setInviteError('');
              }}
              placeholder="colleague@company.com"
            />
          </Field>
          <div className="space-y-2.5">
            {ROLE_INFO.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  role === r.role ? 'border-gold bg-gold/10' : 'border-ink/15 bg-white hover:border-ink/30'
                }`}
              >
                <span
                  className={`mt-1 h-4 w-4 rounded-full border-2 ${
                    role === r.role ? 'border-gold bg-gold' : 'border-ink/25'
                  }`}
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">{r.title}</span>
                  <span className="mt-0.5 block text-xs text-ink/55">{r.blurb}</span>
                </span>
              </button>
            ))}
          </div>
          {role === 'gate' && events.length > 0 ? (
            <Field label="Which events?" hint="Gate staff only see the events they're scoped to.">
              <div className="max-h-36 space-y-1.5 overflow-y-auto">
                {events.map((e) => (
                  <label key={e.id} className="flex items-center gap-2.5 text-sm text-ink/70">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={gateEvents.includes(e.id)}
                      onChange={(ev) =>
                        setGateEvents((prev) =>
                          ev.target.checked ? [...prev, e.id] : prev.filter((x) => x !== e.id),
                        )
                      }
                    />
                    {e.title}
                  </label>
                ))}
              </div>
            </Field>
          ) : null}
          <p className="text-xs text-ink/45">Invites expire after 7 days.</p>
        </div>
      </Modal>
      <ToastHost toasts={toasts} />
    </>
  );
}
