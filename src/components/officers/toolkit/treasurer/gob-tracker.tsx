'use client';

import { useState, useTransition } from 'react';
import { PiggyBank, Plus, X, Check } from 'lucide-react';
import {
  addUpcomingExpense,
  resolveUpcomingExpense,
  deleteUpcomingExpense,
} from '@/lib/actions/upcoming-expenses';
import { useRouter } from 'next/navigation';
import type { GobSummary, UpcomingExpenseRow } from '@/lib/data/ledger-queries';
import { formatDateShortET } from '@/lib/format-date';

function dollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function money(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `$${amount}`;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(d: Date | null): string {
  if (!d) return 'No date';
  return formatDateShortET(d);
}

type Props = {
  summary: GobSummary;
  upcoming: UpcomingExpenseRow[];
};

export function GobTracker({ summary, upcoming }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onCreate = (formData: FormData) => {
    setError(null);
    const description = String(formData.get('description') ?? '');
    const amount = Number(formData.get('amount') ?? 0);
    const expected_date = String(formData.get('expected_date') ?? '') || undefined;
    const counts_toward_gob = formData.get('counts_toward_gob') === 'on';
    const notes = String(formData.get('notes') ?? '') || undefined;
    startTransition(async () => {
      const result = await addUpcomingExpense({
        description,
        amount,
        expected_date,
        counts_toward_gob,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      router.refresh();
    });
  };

  const onResolve = (id: string) => {
    startTransition(async () => {
      await resolveUpcomingExpense(id);
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm('Remove this upcoming expense?')) return;
    startTransition(async () => {
      await deleteUpcomingExpense(id);
      router.refresh();
    });
  };

  const projectedCommitCents = upcoming
    .filter((u) => u.counts_toward_gob)
    .reduce((sum, u) => sum + Math.round(Number(u.amount) * 100), 0);
  const projectedRemainingCents = summary.remainingCents - projectedCommitCents;
  const overBudget = projectedRemainingCents < 0;

  const barTone =
    summary.pct >= 90 ? 'bg-rose-400' : summary.pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-amber-400" />
          GOB Budget
        </h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1 rounded bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/30 border border-amber-400/40 min-h-[32px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Upcoming expense
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-200 font-semibold">
          {dollars(summary.spentCents)} <span className="text-slate-500">of</span>{' '}
          {dollars(summary.availableCents)}
        </span>
        <span className="text-slate-400 text-xs">
          {dollars(summary.remainingCents)} remaining
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${barTone}`} style={{ width: `${summary.pct}%` }} />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Base allocation {dollars(summary.budgetCents)}
        {summary.donationsCents > 0 && (
          <>
            {' '}
            <span className="text-emerald-300">+ {dollars(summary.donationsCents)} in donations/income</span>
          </>
        )}{' '}
        · academic year-to-date. Cash donations deposit into the same UD account, so they extend the effective ceiling.
      </p>

      {upcoming.length > 0 && (
        <>
          <h4 className="mt-4 mb-2 text-sm font-semibold text-white">Upcoming known expenses</h4>
          <ul className="space-y-1.5">
            {upcoming.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 truncate">{u.description}</p>
                  <p className="text-slate-500">
                    {formatDate(u.expected_date)}
                    {u.counts_toward_gob ? ' · GOB' : ' · Not GOB'}
                  </p>
                </div>
                <span className="text-slate-200 tabular-nums">{money(u.amount)}</span>
                <button
                  onClick={() => onResolve(u.id)}
                  disabled={pending}
                  aria-label="Mark resolved"
                  className="text-emerald-300 hover:text-emerald-200 p-1 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(u.id)}
                  disabled={pending}
                  aria-label="Remove"
                  className="text-slate-500 hover:text-rose-300 p-1 disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <p
            className={`mt-3 text-xs ${
              overBudget ? 'text-rose-300' : 'text-slate-400'
            }`}
          >
            Projected remaining after known expenses: {dollars(projectedRemainingCents)}
            {overBudget && ' — projection exceeds GOB. File for an allocation board increase.'}
          </p>
        </>
      )}

      {showForm && (
        <form
          action={onCreate}
          className="mt-4 rounded border border-white/10 bg-black/20 p-3 space-y-3 text-xs"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-slate-300 sm:col-span-2">
              Description
              <input
                name="description"
                required
                placeholder="e.g. Next printing run"
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Amount (USD)
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Expected date
              <input
                name="expected_date"
                type="date"
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                name="counts_toward_gob"
                defaultChecked
              />
              Counts toward $400 GOB
            </label>
            <label className="text-slate-300 sm:col-span-2">
              Notes
              <textarea
                name="notes"
                rows={2}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
          {error && <p className="text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
            >
              Add expense
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border border-white/20 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
