// Open-decision flags. Each implements the *recommended default* from
// designs/handoff/04-open-decisions.md. Do not "resolve" a decision here, // flip the flag once the business owner has decided, and remove the
// TODO(decision-N) markers that reference it.

export const FLAGS = {
  // TODO(decision-2): cancel = full refund incl. fees to every current holder;
  // pending seller payouts voided; platform absorbs the gap. Postpone =
  // auto-rollover with a 14-day refund window.
  decision2_cancelFullRefund: true,
  decision2_postponeRefundWindowDays: 14,

  // TODO(decision-3): 10% reserve released 14 days after the event; a negative
  // balance is netted against future payouts.
  decision3_reservePct: 10,
  decision3_reserveReleaseDays: 14,
  decision3_allowNegativeBalance: true,

  // TODO(decision-4): verified orgs get rolling weekly payouts minus the
  // reserve; new orgs (< 3 events) get paid after the event.
  decision4_rollingWeeklyPayouts: true,
  decision4_newOrgEventThreshold: 3,

  // TODO(decision-5): co-host splits lock at the first sale; after that,
  // changes need both admins and apply to future sales only.
  decision5_splitsLockAtFirstSale: true,

  // TODO(decision-8): resale cap default = face x 1.10; the organiser can
  // lower it but not raise it. Exposed as the cap ceiling in Create/Manage.
  decision8_maxResaleCapPct: 10,

  // TODO(decision-10): verification rejected after sales → payouts held;
  // sales auto-pause after 7 days unresolved.
  decision10_rejectedGraceDays: 7,

  // TODO(decision-13): venue currency; all-in price shown upfront. Studio
  // creates events in AED until multi-currency venues exist.
  decision13_defaultCurrency: 'aed',
} as const;
