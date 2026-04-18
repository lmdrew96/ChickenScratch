'use client';

import { useState, useTransition } from 'react';
import { Receipt, Check, ChevronRight, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import {
  createReimbursement,
  advanceReimbursementStage,
  deleteReimbursement,
} from '@/lib/actions/reimbursements';
import type { ReimbursementRow, ReimbursementStage } from '@/lib/data/reimbursement-types';
import { currentStage, stageTransitionDate } from '@/lib/data/reimbursement-types';
import { formatDateShortET } from '@/lib/format-date';

const STAGES: { key: ReimbursementStage; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'check_received', label: 'Check received' },
  { key: 'ledgered', label: 'Ledgered' },
];

const STUCK_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
function daysAgo(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return formatDateShortET(d);
}

function money(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `$${amount}`;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function ReimbursementPipeline({ initial }: { initial: ReimbursementRow[] }) {
  const [rows, setRows] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch('/api/officer/reimbursements', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as ReimbursementRow[];
      setRows(
        data.map((r) => ({
          ...r,
          submitted_at: new Date(r.submitted_at),
          approved_at: r.approved_at ? new Date(r.approved_at) : null,
          check_received_at: r.check_received_at ? new Date(r.check_received_at) : null,
          ledgered_at: r.ledgered_at ? new Date(r.ledgered_at) : null,
          receipt_date: r.receipt_date ? new Date(r.receipt_date) : null,
          created_at: new Date(r.created_at),
        })),
      );
    }
  };

  const onCreate = (formData: FormData) => {
    const description = String(formData.get('description') ?? '');
    const amount = Number(formData.get('amount') ?? 0);
    const receipt_date = String(formData.get('receipt_date') ?? '') || null;
    const notes = String(formData.get('notes') ?? '') || null;
    setFormError(null);
    startTransition(async () => {
      const result = await createReimbursement({ description, amount, receipt_date, notes });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setShowForm(false);
      await refresh();
    });
  };

  const onAdvance = (row: ReimbursementRow, target: ReimbursementStage) => {
    setBusyId(row.id);
    startTransition(async () => {
      let check_number: string | undefined;
      if (target === 'check_received') {
        const v = window.prompt('Enter the check number from the approval email:');
        if (!v) {
          setBusyId(null);
          return;
        }
        check_number = v;
      }
      const result = await advanceReimbursementStage({ id: row.id, target, check_number });
      if (!result.ok) {
        window.alert(result.error);
      }
      await refresh();
      setBusyId(null);
    });
  };

  const onDelete = (row: ReimbursementRow) => {
    if (!window.confirm(`Delete reimbursement "${row.description}"?`)) return;
    setBusyId(row.id);
    startTransition(async () => {
      await deleteReimbursement(row.id);
      await refresh();
      setBusyId(null);
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Receipt className="h-5 w-5 text-emerald-400" />
          Reimbursement Pipeline
        </h3>
        <button
          onClick={() => {
            setFormError(null);
            setShowForm((s) => !s);
          }}
          className="inline-flex items-center gap-1 rounded bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/30 border border-emerald-400/40 min-h-[32px]"
        >
          <Plus className="h-3.5 w-3.5" />
          New request
        </button>
      </div>

      {showForm && (
        <form
          action={onCreate}
          className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">
              Description
              <input
                name="description"
                required
                placeholder="e.g. Public library printing run, Issue 12"
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-xs text-slate-300">
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
            <label className="text-xs text-slate-300">
              Receipt date
              <input
                name="receipt_date"
                type="date"
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-xs text-slate-300 sm:col-span-2">
              Notes
              <textarea
                name="notes"
                rows={2}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
          {formError && <p className="text-xs text-rose-300">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-300"
            >
              Create
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

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No reimbursements yet. The cash box is unscathed.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const stage = currentStage(row);
            const stageIdx = STAGES.findIndex((s) => s.key === stage);
            const lastMove = stageTransitionDate(row);
            const stuck = stage !== 'ledgered' && daysAgo(lastMove) >= STUCK_DAYS;
            const nextStage = STAGES[stageIdx + 1];

            return (
              <li
                key={row.id}
                className={`rounded-xl border p-3 ${
                  stuck ? 'border-amber-400/40 bg-amber-400/5' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {row.description}{' '}
                      <span className="text-slate-400 font-normal">— {money(row.amount)}</span>
                    </p>
                    {row.check_number && (
                      <p className="text-[11px] text-slate-500">Check #{row.check_number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(row)}
                    className="text-slate-500 hover:text-rose-300 p-1"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px]">
                  {STAGES.map((s, i) => {
                    const done = i <= stageIdx;
                    const active = i === stageIdx;
                    return (
                      <div key={s.key} className="flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 border ${
                            active
                              ? 'bg-emerald-400/20 border-emerald-400/40 text-emerald-200'
                              : done
                              ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-300/80'
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          {done && <Check className="h-3 w-3" />}
                          {s.label}
                        </span>
                        {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
                  <span>Sub: {formatDate(row.submitted_at)}</span>
                  <span>Apr: {formatDate(row.approved_at)}</span>
                  <span>Chk: {formatDate(row.check_received_at)}</span>
                  <span>Ldg: {formatDate(row.ledgered_at)}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {stuck && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      Stuck {daysAgo(lastMove)}d at &quot;{STAGES[stageIdx]?.label ?? stage}&quot;
                    </span>
                  )}
                  {nextStage && (
                    <button
                      onClick={() => onAdvance(row, nextStage.key)}
                      disabled={busyId === row.id}
                      className="ml-auto rounded bg-white/10 border border-white/20 px-2.5 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-60 min-h-[32px]"
                    >
                      Advance → {nextStage.label}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
