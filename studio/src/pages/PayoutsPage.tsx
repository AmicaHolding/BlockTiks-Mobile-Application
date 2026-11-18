import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { FLAGS } from '../lib/flags';
import { useOrg } from '../lib/org';
import { fetchOrgOrders, orderGrossCents } from '../lib/sales';
import { formatDay, formatMoney } from '../lib/format';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  NightCard,
  PageHeader,
  ToastHost,
  useToasts,
} from '../components/ui';

/** Spec: min payout AED 1,000 → 100000 minor units. */
const MIN_PAYOUT_MINOR = 100000;
/** Organiser keeps 95%, platform takes 5% (prototype copy). */
const ORG_SHARE = 0.95;

export default function PayoutsPage() {
  const { org, refresh } = useOrg();
  const { toasts, push } = useToasts();
  const [gross, setGross] = useState(0);
  const [refunded, setRefunded] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [iban, setIban] = useState('');
  const [holder, setHolder] = useState('');
  const [bankError, setBankError] = useState('');
  const [confirmPay, setConfirmPay] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    if (!org) return;
    setHolder((h) => h || org.legalName || '');
    api
      .myEvents()
      .then(async ({ events: evts }) => {
        const orders = await fetchOrgOrders(evts);
        const refundedIds = new Set(api.refundedOrderIds());
        let paid = 0;
        let ref = 0;
        for (const o of orders) {
          if (refundedIds.has(o.id) || o.status === 'REFUNDED') {
            if (o.status === 'PAID' || refundedIds.has(o.id)) ref += orderGrossCents(o);
          } else if (o.status === 'PAID') {
            paid += orderGrossCents(o);
          }
        }
        setGross(paid);
        setRefunded(ref);
      })
      .catch(() => undefined);
  }, [org, refreshKey]);

  const payouts = useMemo(() => (org ? api.orgPayouts(org.id) : []), [org, refreshKey]);
  const paidOut = payouts
    .filter((p) => p.status !== 'failed')
    .reduce((a, p) => a + p.amountMinor, 0);
  const earned = Math.round(gross * ORG_SHARE) - refunded;
  const available = earned - paidOut;
  const reserve = Math.max(0, Math.round(available * (FLAGS.decision3_reservePct / 100)));

  if (!org) return <LoadingBlock />;
  const currency = org.currency;
  const hasBank = Boolean(org.payoutAccount);
  const verified = org.verificationStatus === 'approved';

  function saveBank(e: React.FormEvent) {
    e.preventDefault();
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (!/^AE\d{21}$/.test(clean)) {
      setBankError('UAE IBANs are AE + 21 digits.');
      return;
    }
    const res = api.savePayoutAccount(org!.id, { iban: clean, holder: holder.trim() });
    if (res && 'error' in res && res.error === 'name_mismatch') {
      setBankError('Holder name must match the legal name on your trade licence.');
      return;
    }
    setBankError('');
    refresh();
    push('Bank account saved.');
    setRefreshKey((k) => k + 1);
  }

  function tryPayout() {
    setConfirmPay(false);
    if (!hasBank) {
      setPayError('Add a bank account first.');
      return;
    }
    if (!verified) {
      setPayError('Payouts start once verification is approved.');
      return;
    }
    if (available < MIN_PAYOUT_MINOR) {
      setPayError('Minimum payout is AED 1,000.');
      return;
    }
    api.requestPayout(org!.id, available, currency, `•••• ${org!.payoutAccount!.ibanLast4}`);
    push(`Payout of ${formatMoney(available, currency)} is on its way.`);
    setRefreshKey((k) => k + 1);
  }

  const nextPayoutDay = (() => {
    // TODO(decision-4): rolling weekly payouts for verified orgs, next Monday.
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    return formatDay(d.toISOString());
  })();

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Ticket money, minus 5% fees, lands here. Refunds come out of the next payout."
      />

      {!hasBank ? (
        <Card title="Add a business bank account" className="max-w-lg">
          <p className="mb-5 text-sm leading-relaxed text-ink/60">
            Ticket money is held until you add one. It must match the name on your trade licence.
          </p>
          <form onSubmit={saveBank} className="space-y-4">
            <Field label="Account holder" hint="Must match the legal name on your trade licence.">
              <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder={org.legalName ?? 'Legal name'} />
            </Field>
            <Field label="IBAN" hint="UAE IBAN · AE + 21 digits.">
              <Input
                className="font-mono uppercase"
                value={iban}
                onChange={(e) => {
                  setIban(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setBankError('');
                }}
                placeholder="AE07 0331 2345 6789 0123 456"
                maxLength={23}
              />
            </Field>
            {bankError ? <p className="text-sm font-medium text-rumman">{bankError}</p> : null}
            <Button type="submit">Save bank account</Button>
          </form>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <NightCard title="Available now">
              <p className={`font-display text-5xl font-bold tabular-nums ${available < 0 ? 'text-rumman' : ''}`}>
                {formatMoney(available, currency)}
              </p>
              {available < 0 ? (
                // TODO(decision-3): negative balance netted against future payouts
                <p className="mt-2 text-sm text-sand/60">
                  Refunds put you under, the next payout covers it.
                </p>
              ) : null}
              <p className="mt-2 text-sm text-sand/55">
                Automatic payout {nextPayoutDay} · to ·· {org.payoutAccount?.ibanLast4}
              </p>
              <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-xs text-sand/50">
                {/* TODO(decision-3): 10% reserve released 14 days after each event */}
                <p>
                  Held in reserve ({FLAGS.decision3_reservePct}% until{' '}
                  {FLAGS.decision3_reserveReleaseDays} days after each event):{' '}
                  <span className="text-sand/80 tabular-nums">{formatMoney(reserve, currency)}</span>
                </p>
                {refunded > 0 ? (
                  <p>
                    Refunded: <span className="text-sand/80 tabular-nums">{formatMoney(refunded, currency)}</span>
                  </p>
                ) : null}
              </div>
              <div className="mt-5">
                <Button onClick={() => setConfirmPay(true)}>Pay out now</Button>
              </div>
              {payError ? <p className="mt-3 text-sm font-medium text-rumman">{payError}</p> : null}
            </NightCard>

            <Card title="Payout history">
              {payouts.length === 0 ? (
                <EmptyState
                  title="Nothing yet"
                  body={`Your first payout lands once ${org.name} is verified and selling.`}
                />
              ) : (
                <div className="-mx-2 divide-y divide-dune/70">
                  {payouts.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-2 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{p.bankLabel}</p>
                        <p className="text-xs text-ink/45">{formatDay(p.createdAt)}</p>
                      </div>
                      <Badge tone={p.status === 'paid' ? 'default' : 'gold'} className="capitalize">
                        {p.status === 'in_transit' ? 'Processing' : p.status}
                      </Badge>
                      <span className="w-28 text-right font-semibold tabular-nums">
                        {formatMoney(p.amountMinor, p.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="How it works">
            <ul className="space-y-3 text-sm leading-relaxed text-ink/60">
              <li>· Money lands weekly, every Monday.</li>
              <li>· {FLAGS.decision3_reservePct}% is held in reserve until {FLAGS.decision3_reserveReleaseDays} days after each event.</li>
              <li>· Refunds come out of the next payout, the balance can go negative.</li>
              <li>· Minimum manual payout is {formatMoney(MIN_PAYOUT_MINOR, currency)}.</li>
            </ul>
          </Card>
        </div>
      )}

      {/* TODO(api-gap): POST /orgs/{id}/payouts, errors no_bank, unverified,
          negative_balance; Idempotency-Key required */}
      <ConfirmDialog
        open={confirmPay}
        onClose={() => setConfirmPay(false)}
        title={`Pay out ${formatMoney(Math.max(0, available), currency)}?`}
        body={`To ·· ${org.payoutAccount?.ibanLast4}. Arrives in 1-2 working days. Refunds after this come out of your next payout.`}
        confirmLabel="Pay out"
        onConfirm={tryPayout}
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}
