import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { api, ApiError } from '../lib/api';
import { formatMoney, formatShortDateTime } from '../lib/format';
import type { CheckoutSelection } from './EventPage';
import { Badge, Button, Card, EmptyState, Input, Spinner } from '../components/ui';
import { ArrowLeftIcon, CheckIcon, ShieldIcon, TicketIcon } from '../components/icons';
import { useAuth } from '../lib/auth';

const STRIPE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

interface CheckoutState {
  selection?: CheckoutSelection;
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const selection = (location.state as CheckoutState | null)?.selection ?? null;

  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState<string | undefined>(undefined);
  const [intent, setIntent] = useState<{
    orderId: string;
    clientSecret: string;
    amountCents: number;
    subtotalCents: number;
    discountCents: number;
    feesCents: number;
  } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'paid' | 'confirming' | null>(null);

  const itemLabel = useMemo(() => {
    if (!selection) return '';
    if (selection.kind === 'resale') return `1 × ${selection.tierName} (resale)`;
    if (selection.kind === 'section') {
      const seats = selection.seatLabels?.length ? ` — seats ${selection.seatLabels.join(', ')}` : '';
      return `${selection.quantity} × ${selection.sectionName}${seats}`;
    }
    return `${selection.quantity} × ${selection.tierName}`;
  }, [selection]);

  const currency = selection?.currency ?? 'usd';
  const money = (cents: number) => formatMoney(cents, currency);

  if (!selection) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState title="Nothing to check out" tone="light">
          <Link to="/explore" className="text-night underline">
            Browse events
          </Link>{' '}
          first.
        </EmptyState>
      </div>
    );
  }

  async function startCheckout() {
    setPreparing(true);
    setError(null);
    try {
      const res = await api.orderIntent({
        eventId: selection!.eventId,
        tierId: selection!.kind === 'tier' ? selection!.tierId : undefined,
        sectionId: selection!.kind === 'section' ? selection!.sectionId : undefined,
        listingCode: selection!.kind === 'resale' ? selection!.listingCode : undefined,
        quantity: selection!.kind === 'resale' ? 1 : selection!.quantity,
        seats: selection!.kind === 'section' ? selection!.seatLabels : undefined,
        promoCode,
      });
      if (!res.clientSecret) throw new ApiError(500, 'Stripe is not configured for this order');
      setIntent({
        orderId: res.orderId,
        clientSecret: res.clientSecret,
        amountCents: res.amountCents,
        subtotalCents: res.subtotalCents,
        discountCents: res.discountCents,
        feesCents: res.feesCents,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start checkout');
    } finally {
      setPreparing(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon size={30} className="text-emerald-700" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">
          {done === 'paid' ? 'You’re in.' : 'Payment received'}
        </h1>
        <p className="mt-2 text-ink/60">
          {done === 'paid'
            ? 'Your tickets are ready in the Tickets tab.'
            : 'We’re confirming your payment — your tickets will appear in Tickets shortly.'}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/tickets">
            <Button variant="night">View tickets</Button>
          </Link>
          <Link to={`/events/${selection.eventId}`}>
            <Button variant="outline" tone="light">Back to event</Button>
          </Link>
        </div>
      </div>
    );
  }

  const faceTotal = intent?.subtotalCents ?? selection.priceCents * (selection.kind === 'resale' ? 1 : selection.quantity);
  const discount = intent?.discountCents ?? 0;
  const fees = intent?.feesCents ?? null;
  const total = intent?.amountCents ?? null;

  return (
    <div className="min-h-[calc(100vh-76px)] bg-sand text-ink">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 transition hover:text-ink"
        >
          <ArrowLeftIcon size={15} /> Back
        </button>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">Checkout</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left: contact + payment */}
          <div className="flex flex-col gap-6">
            <Card tone="light" className="p-6">
              <h2 className="font-display text-lg font-extrabold text-ink">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-sm font-semibold text-ink">Full name</div>
                  <Input tone="light" value={[user?.firstName, user?.lastName].filter(Boolean).join(' ')} readOnly />
                </div>
                <div>
                  <div className="mb-1.5 text-sm font-semibold text-ink">Email</div>
                  <Input tone="light" type="email" value={user?.email ?? ''} readOnly />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1.5 text-sm font-semibold text-ink">Mobile</div>
                  <Input tone="light" value={user?.phone ?? ''} placeholder="+971 50 000 0000" readOnly={!user?.phone} />
                </div>
              </div>
            </Card>

            <Card tone="light" className="p-6">
              <h2 className="font-display text-lg font-extrabold text-ink">Pay with</h2>
              {!intent ? (
                <div className="mt-4">
                  {STRIPE_KEY ? (
                    <Button variant="night" onClick={startCheckout} disabled={preparing} className="px-6">
                      {preparing ? <Spinner className="border-sand border-t-transparent" /> : null}
                      Continue to payment
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                      Payments aren’t configured for this deployment. Set{' '}
                      <code className="font-mono">VITE_STRIPE_PUBLISHABLE_KEY</code> to enable checkout.
                    </div>
                  )}
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/50">
                    <ShieldIcon size={13} /> Payments secured by Stripe. Tickets appear in your Tickets tab instantly.
                  </p>
                </div>
              ) : stripePromise ? (
                <div className="mt-4">
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: intent.clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#241C14',
                          colorBackground: '#ffffff',
                          colorText: '#241C14',
                          colorDanger: '#B8323A',
                          fontFamily: '"IBM Plex Sans Arabic", sans-serif',
                          borderRadius: '12px',
                        },
                      },
                    }}
                  >
                    <PaymentForm
                      orderId={intent.orderId}
                      onError={setError}
                      onDone={(paid) => setDone(paid ? 'paid' : 'confirming')}
                    />
                  </Elements>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Stripe publishable key missing.
                </div>
              )}
              {error ? <div className="mt-3 text-sm font-semibold text-rumman">{error}</div> : null}
            </Card>
          </div>

          {/* Right: summary */}
          <Card tone="light" className="h-fit p-6 lg:sticky lg:top-24">
            <div className="flex items-start gap-3">
              <TicketIcon size={20} className="mt-0.5 shrink-0 text-night" />
              <div className="min-w-0">
                <div className="font-display text-base font-extrabold text-ink">{selection.eventTitle}</div>
                <div className="text-sm text-ink/60">
                  {formatShortDateTime(selection.eventStartsAt)} · {selection.eventLocation}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-dune/60 px-4 py-3 text-sm font-semibold text-ink">
              {itemLabel}
            </div>

            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/60">Subtotal</span>
                <span className="font-semibold text-ink">{money(faceTotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Promo {promoCode}</span>
                  <span className="font-semibold">−{money(discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-ink/60">Service fee</span>
                <span className="font-semibold text-ink">{fees != null ? money(fees) : '—'}</span>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-3 text-base">
                <span className="font-bold text-ink">Total</span>
                <span className="font-display text-xl font-extrabold text-ink">
                  {total != null ? money(total) : money(faceTotal)}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
                <span>Promo code</span>
                {promoCode ? <Badge tone="green">Applied</Badge> : null}
              </div>
              <div className="flex gap-2">
                <Input
                  tone="light"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Add"
                  disabled={Boolean(intent)}
                />
                <Button
                  variant="ghost"
                  disabled={!promoInput.trim() || Boolean(intent)}
                  onClick={() => setPromoCode(promoInput.trim() || undefined)}
                >
                  Apply
                </Button>
              </div>
              {intent ? (
                <p className="mt-2 text-[11px] text-ink/50">
                  Promo is validated when you pay — an invalid code will be rejected by the server.
                </p>
              ) : null}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-ink/50">
              By paying you agree to the organizer’s terms. Refunds only if the event is cancelled.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PaymentForm({
  orderId,
  onError,
  onDone,
}: {
  orderId: string;
  onError: (message: string) => void;
  onDone: (paid: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setProcessing(true);
    onError('');
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/tickets` },
    });
    if (error) {
      onError(error.message ?? 'Payment failed');
      setProcessing(false);
      return;
    }
    // Webhook fulfills the order asynchronously — poll briefly.
    for (let i = 0; i < 10; i++) {
      try {
        const res = await api.order(orderId);
        if (res.order.status === 'PAID') {
          onDone(true);
          return;
        }
        if (res.order.status === 'FAILED' || res.order.status === 'CANCELLED') {
          onError('Payment could not be completed. Please try again.');
          setProcessing(false);
          return;
        }
      } catch {
        // keep polling
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    onDone(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button variant="night" className="w-full py-3 text-base" disabled={!stripe || processing} onClick={pay}>
        {processing ? <Spinner className="border-sand border-t-transparent" /> : null}
        {processing ? 'Processing…' : 'Pay'}
      </Button>
    </div>
  );
}
