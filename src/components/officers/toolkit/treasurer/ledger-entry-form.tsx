'use client';

import { useState, useTransition } from 'react';
import { BookOpenCheck, Plus, ChevronDown } from 'lucide-react';
import {
  createLedgerEntry,
  type LedgerEntryType,
  type PaymentMethod,
} from '@/lib/actions/ledger';
import type { LedgerEntryRow } from '@/lib/data/ledger-queries';
import { useRouter } from 'next/navigation';

const PRESETS: Array<{
  label: string;
  values: {
    entry_type: LedgerEntryType;
    description: string;
    category?: string;
    payment_method?: PaymentMethod;
    is_out_of_pocket?: boolean;
    purpose_code?: string;
  };
}> = [
  {
    label: 'Chicken Scratch printing (out-of-pocket)',
    values: {
      entry_type: 'expense',
      description: 'Chicken Scratch printing run',
      category: 'Printing',
      payment_method: 'other',
      is_out_of_pocket: true,
    },
  },
  {
    label: 'Cash donation at meeting',
    values: {
      entry_type: 'donation',
      description: 'Cash donation',
      category: 'Dues/Donations',
      payment_method: 'cash',
    },
  },
  {
    label: 'Card donation at meeting',
    values: {
      entry_type: 'donation',
      description: 'Card donation',
      category: 'Dues/Donations',
      payment_method: 'card',
    },
  },
  {
    label: 'Ad invoice income',
    values: {
      entry_type: 'income',
      description: 'Advertising invoice payment',
      category: 'Ad revenue',
      payment_method: 'check',
    },
  },
];

function money(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `$${amount}`;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function LedgerEntryForm({ recent }: { recent: LedgerEntryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<LedgerEntryType>('expense');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [purposeCode, setPurposeCode] = useState('');
  const [isOutOfPocket, setIsOutOfPocket] = useState(false);
  const [countsTowardGob, setCountsTowardGob] = useState(true);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showFollowup, setShowFollowup] = useState<null | { id: string }>(null);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const v = preset.values;
    setEntryType(v.entry_type);
    setDescription(v.description);
    if (v.category) setCategory(v.category);
    if (v.payment_method) setPaymentMethod(v.payment_method);
    if (v.purpose_code) setPurposeCode(v.purpose_code);
    if (typeof v.is_out_of_pocket === 'boolean') setIsOutOfPocket(v.is_out_of_pocket);
    setOpen(true);
  };

  const reset = () => {
    setDescription('');
    setCategory('');
    setAmount('');
    setNotes('');
    setPurposeCode('');
    setIsOutOfPocket(false);
    setCountsTowardGob(true);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Amount must be > 0');
      return;
    }
    startTransition(async () => {
      const result = await createLedgerEntry({
        entry_type: entryType,
        amount: amt,
        description,
        category,
        entry_date: entryDate,
        payment_method: paymentMethod,
        purpose_code: purposeCode || undefined,
        is_out_of_pocket: isOutOfPocket,
        counts_toward_gob: countsTowardGob,
        notes: notes || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (entryType === 'expense' && isOutOfPocket) {
        setShowFollowup({ id: result.id });
      } else {
        setOpen(false);
        reset();
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-emerald-400" />
          Ledger Entry
        </h3>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/30 border border-emerald-400/40 min-h-[32px]"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {open ? 'Collapse' : 'New entry'}
        </button>
      </div>

      {!open && recent.length === 0 && (
        <p className="text-sm text-slate-400">No ledger activity yet this term.</p>
      )}

      {!open && recent.length > 0 && (
        <ul className="space-y-1.5 text-xs">
          {recent.slice(0, 5).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-slate-400">
              <span className="truncate">
                <span
                  className={
                    r.entry_type === 'expense'
                      ? 'text-rose-300'
                      : r.entry_type === 'income'
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }
                >
                  {r.entry_type}
                </span>{' '}
                · {r.description ?? r.category ?? 'Untitled'}
              </span>
              <span className="text-slate-300 tabular-nums">{money(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={submit} className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-slate-300">
              Type
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as LedgerEntryType)}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="donation">Donation</option>
              </select>
            </label>
            <label className="text-slate-300">
              Amount (USD)
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Date
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300 sm:col-span-2">
              Description
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Category
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Payment method
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="venmo">Venmo</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-slate-300">
              Purpose code
              <input
                value={purposeCode}
                onChange={(e) => setPurposeCode(e.target.value)}
                placeholder="optional"
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>

          {entryType === 'expense' && (
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={isOutOfPocket}
                  onChange={(e) => setIsOutOfPocket(e.target.checked)}
                />
                Out-of-pocket (needs reimbursement)
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={countsTowardGob}
                  onChange={(e) => setCountsTowardGob(e.target.checked)}
                />
                Counts toward $400 GOB
              </label>
            </div>
          )}

          <label className="text-slate-300 block">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
            />
          </label>

          {error && <p className="text-rose-300">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-300 disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save entry'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="rounded border border-white/20 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>

          {showFollowup && (
            <div className="mt-3 rounded border border-amber-400/40 bg-amber-400/5 p-3 text-amber-100">
              Out-of-pocket expense recorded. Start a matching reimbursement request in the
              pipeline above to track it through RFC submission.
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFollowup(null);
                    setOpen(false);
                    reset();
                  }}
                  className="rounded bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-slate-900 hover:bg-amber-300"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
