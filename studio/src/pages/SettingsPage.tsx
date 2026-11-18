import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrg } from '../lib/org';
import { formatMoney } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Input,
  PageHeader,
  ToastHost,
  useToasts,
} from '../components/ui';
import VerifyModal from '../components/VerifyModal';
import { TeamPanel } from './TeamPage';
import { api } from '../lib/api';

const TABS = ['Organisation', 'Payouts', 'Team'] as const;

export default function SettingsPage() {
  const { org, refresh } = useOrg();
  const { toasts, push } = useToasts();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab = TABS.find((t) => t.toLowerCase() === tabParam) ?? 'Organisation';
  const [verifyOpen, setVerifyOpen] = useState(false);

  if (!org) return null;

  const licenceStatus =
    org.verificationStatus === 'approved'
      ? 'Verified'
      : org.verificationStatus === 'submitted'
        ? 'In review'
        : org.verificationStatus === 'rejected'
          ? 'Rejected'
          : 'Not verified';

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <Chip
            key={t}
            selected={tab === t}
            onClick={() => setParams({ tab: t.toLowerCase() })}
          >
            {t}
          </Chip>
        ))}
      </div>

      {tab === 'Organisation' ? (
        <div className="max-w-xl space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-night font-display text-xl font-bold text-gold">
                {org.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold text-night">{org.name}</p>
                <p className="text-sm text-ink/50">
                  {licenceStatus} · {org.city}, {org.country}
                </p>
              </div>
              <Badge
                tone={
                  org.verificationStatus === 'approved'
                    ? 'gold'
                    : org.verificationStatus === 'rejected'
                      ? 'danger'
                      : 'outline'
                }
              >
                {licenceStatus}
              </Badge>
            </div>
          </Card>

          <Card title="Details">
            <div className="space-y-4">
              <Field label="Organisation name">
                <Input defaultValue={org.name} disabled title="Rename needs the org PATCH endpoint" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Trade licence no.">
                  <Input
                    defaultValue={org.tradeLicenceNo ?? ''}
                    disabled
                    placeholder="Verify to add"
                  />
                </Field>
                <Field label="Default currency">
                  {/* TODO(decision-13): venue currency · AED default */}
                  <Input defaultValue={org.currency.toUpperCase()} disabled />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Verification">
            {org.verificationStatus === 'approved' ? (
              <p className="text-sm text-ink/60">
                Approved, you can publish events, invite the team and receive payouts.
              </p>
            ) : org.verificationStatus === 'submitted' ? (
              <p className="text-sm text-ink/60">
                In review, usually a day or two. We'll email you when it's checked.
              </p>
            ) : (
              <div>
                {org.verificationStatus === 'rejected' ? (
                  <p className="mb-3 rounded-lg border border-rumman/30 bg-rumman/5 px-4 py-3 text-sm text-rumman">
                    Rejected{org.rejectionReason ? `, ${org.rejectionReason}` : ''}. Fix the
                    details and resubmit.
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-ink/60">
                    Verification is required before you can publish events, invite people or get
                    paid.
                  </p>
                )}
                <Button small onClick={() => setVerifyOpen(true)}>
                  {org.verificationStatus === 'rejected' ? 'Resubmit verification' : 'Verify now'}
                </Button>
              </div>
            )}
            {import.meta.env.DEV && org.verificationStatus !== 'approved' ? (
              <div className="mt-4 border-t border-dune pt-3">
                <button
                  type="button"
                  className="text-xs font-medium text-ink/40 underline underline-offset-2 hover:text-ink"
                  onClick={() => {
                    api.devApproveVerification(org.id);
                    refresh();
                    push('Sandbox: verification approved.');
                  }}
                >
                  Sandbox: approve verification
                </button>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {tab === 'Payouts' ? (
        <div className="max-w-xl space-y-6">
          <Card title="Bank account">
            {org.payoutAccount ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-ink">AE ·· {org.payoutAccount.ibanLast4}</p>
                  <p className="mt-0.5 text-xs text-ink/45">{org.payoutAccount.holder}</p>
                </div>
                <Badge tone="gold">Connected</Badge>
              </div>
            ) : (
              <p className="text-sm text-ink/60">
                No account yet, add one in Payouts. Ticket money is held until you do.
              </p>
            )}
          </Card>
          <Card title="Schedule">
            <p className="text-sm text-ink/60">
              {/* TODO(decision-4): rolling weekly payouts for verified orgs */}
              Weekly, every Monday. Minimum manual payout{' '}
              {formatMoney(100000, org.currency)}.
            </p>
          </Card>
        </div>
      ) : null}

      {tab === 'Team' ? <TeamPanel /> : null}

      <VerifyModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onSubmitted={() => push('Verification submitted. We\'ll email you once it\'s checked.')}
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}
