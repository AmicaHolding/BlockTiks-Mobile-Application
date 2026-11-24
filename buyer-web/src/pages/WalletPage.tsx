import { useEffect, useState } from 'react';
import { api, type Wallet, type WalletActivity } from '../lib/api';
import { formatMoney, formatShortDateTime } from '../lib/format';
import { Spinner } from '../components/ui';

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [rows, setRows] = useState<WalletActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [err, setErr] = useState('');

  function load() {
    setLoading(true);
    Promise.all([api.wallet(), api.walletActivity()])
      .then(([w, a]) => {
        setWallet(w.wallet);
        setRows(a.rows);
      })
      .catch(() => setErr('Could not load your wallet'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function withdraw() {
    if (!wallet || wallet.cashMinor <= 0 || withdrawing) return;
    if (!window.confirm(`Withdraw ${formatMoney(wallet.cashMinor, 'aed')} to your bank?`)) return;
    setWithdrawing(true);
    try {
      await api.walletWithdraw(wallet.cashMinor);
      load();
    } catch {
      setErr('Withdrawal failed — try again');
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const cash = wallet?.cashMinor ?? 0;
  const credits = wallet?.creditsMinor ?? 0;

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-[18px] px-8 py-7 pb-10">
      <strong className="text-[34px] font-extrabold tracking-[-0.03em] text-sand">Wallet</strong>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        <div className="flex flex-col gap-2 rounded-[22px] bg-gold p-[26px] text-night">
          <span className="text-[12px] font-bold tracking-[0.14em]">CASH</span>
          <strong className="text-[42px] font-extrabold tracking-[-0.03em]">
            {formatMoney(cash, 'aed')}
          </strong>
          <span className="text-[14px] leading-[1.5]">
            From tickets you resold. Withdraw to your bank, or spend it on tickets.
          </span>
          <button
            type="button"
            onClick={withdraw}
            disabled={cash <= 0 || withdrawing}
            className="mt-1.5 self-start rounded-full bg-night px-[18px] py-[11px] text-[15px] font-semibold text-gold disabled:opacity-50"
          >
            {withdrawing ? 'Withdrawing…' : 'Withdraw to bank'}
          </button>
        </div>
        <div className="flex flex-col gap-2 rounded-[22px] bg-night-elevated p-[26px]">
          <span className="text-[12px] font-bold tracking-[0.14em] text-gold">CREDITS</span>
          <strong className="text-[42px] font-extrabold tracking-[-0.03em] text-sand">
            {formatMoney(credits, 'aed')}
          </strong>
          <span className="text-[14px] leading-[1.5] text-night-muted">
            Fee refunds. When a payment costs us less to process than the 7% fee, the difference
            minus 2% comes back here. Spend it on any ticket. It can’t be withdrawn.
          </span>
        </div>
      </div>

      <span className="pt-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-night-muted">
        Activity
      </span>

      {err ? <p className="text-sm text-rumman">{err}</p> : null}

      {rows.length === 0 ? (
        <div className="rounded-[18px] border-[1.5px] border-dashed border-night-border p-7 text-night-muted">
          Nothing yet. Credits from purchases and cash from resales show up here.
        </div>
      ) : (
        <div className="rounded-[18px] bg-night-elevated px-5 py-1">
          {rows.map((r, i) => (
            <div
              key={`${r.at}-${i}`}
              className="flex items-center justify-between gap-3 border-b border-[#2f4560] py-3.5 last:border-b-0"
            >
              <span className="flex flex-col gap-0.5">
                <strong className="text-[15px] text-sand">{r.label}</strong>
                <span className="text-[13px] text-night-muted">{formatShortDateTime(r.at)}</span>
              </span>
              <strong
                className="text-[15px]"
                style={{ color: r.amountMinor >= 0 ? '#8fd3a6' : '#e08a8a' }}
              >
                {r.amountMinor >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(r.amountMinor), 'aed')}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
