'use client';

import { useTransition } from 'react';
import { ShieldAlert, Banknote, Clock, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { markCashDonationDeposited } from '@/lib/actions/ledger';
import type { ReceiptAgingAlert, CashDepositAlert } from '@/lib/data/compliance';

function money(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `$${amount}`;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function hoursText(hours: number): string {
  if (hours <= 0) return `${Math.abs(Math.floor(hours))}h overdue`;
  if (hours < 1) return `${Math.round(hours * 60)}m left`;
  return `${Math.floor(hours)}h left`;
}

type Props = {
  receiptAlerts: ReceiptAgingAlert[];
  cashAlerts: CashDepositAlert[];
};

export function ComplianceAlerts({ receiptAlerts, cashAlerts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const markDeposited = (id: string) => {
    startTransition(async () => {
      await markCashDonationDeposited(id);
      router.refresh();
    });
  };

  if (receiptAlerts.length === 0 && cashAlerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 sm:p-6 shadow-lg">
        <h3 className="text-base font-bold text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Compliance
        </h3>
        <p className="mt-2 text-sm text-emerald-100/80">
          No aging receipts or undeposited cash donations. The Treasury dragon sleeps.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-rose-400" />
        Compliance Alerts
      </h3>

      {receiptAlerts.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-white">
            Receipt aging (45-day RFC window)
          </h4>
          <ul className="space-y-2">
            {receiptAlerts.map((a) => {
              const tone =
                a.tone === 'danger' || a.tone === 'past'
                  ? 'border-rose-400/40 bg-rose-400/5 text-rose-200'
                  : 'border-amber-400/40 bg-amber-400/5 text-amber-200';
              return (
                <li
                  key={a.id}
                  className={`rounded border ${tone} px-3 py-2 text-xs flex flex-wrap items-center gap-2`}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 min-w-0 truncate">
                    {a.description} — {money(a.amount)}
                  </span>
                  <span className="text-[11px] tabular-nums">
                    Day {a.daysSinceReceipt} of 45
                    {a.tone === 'past' ? ' · PAST WINDOW' : ` · ${a.daysRemaining}d left`}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {cashAlerts.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-white">
            Undeposited cash donations (24h rule)
          </h4>
          <ul className="space-y-2">
            {cashAlerts.map((c) => {
              const tone = c.overdue
                ? 'border-rose-400/40 bg-rose-400/5 text-rose-200'
                : c.hoursUntilDeadline <= 4
                ? 'border-amber-400/40 bg-amber-400/5 text-amber-200'
                : 'border-white/10 bg-white/5 text-slate-200';
              return (
                <li
                  key={c.id}
                  className={`rounded border ${tone} px-3 py-2 text-xs flex flex-wrap items-center gap-2`}
                >
                  <Banknote className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 min-w-0 truncate">
                    {c.description ?? 'Cash donation'} — {money(c.amount)}
                  </span>
                  <span className="text-[11px] tabular-nums">{hoursText(c.hoursUntilDeadline)}</span>
                  <button
                    onClick={() => markDeposited(c.id)}
                    disabled={pending}
                    className="rounded bg-emerald-400/20 border border-emerald-400/40 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/30 disabled:opacity-60 min-h-[28px]"
                  >
                    Mark deposited
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
