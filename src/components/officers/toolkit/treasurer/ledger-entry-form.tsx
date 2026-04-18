'use client';

import { useState, useTransition } from 'react';
import { BookOpenCheck, Plus, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import {
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
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

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDateInput(d: Date): string {
  // ISO "YYYY-MM-DD" matching the <input type="date"> format in local tz.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type FormState = {
  entryType: LedgerEntryType;
  description: string;
  category: string;
  amount: string;
  paymentMethod: PaymentMethod;
  purposeCode: string;
  isOutOfPocket: boolean;
  countsTowardGob: boolean;
  entryDate: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    entryType: 'expense',
    description: '',
    category: '',
    amount: '',
    paymentMethod: 'card',
    purposeCode: '',
    isOutOfPocket: false,
    countsTowardGob: true,
    entryDate: toDateInput(new Date()),
    notes: '',
  };
}

function fromRow(row: LedgerEntryRow): FormState {
  return {
    entryType: (row.entry_type as LedgerEntryType) ?? 'expense',
    description: row.description ?? '',
    category: row.category ?? '',
    amount: row.amount,
    paymentMethod: (row.payment_method as PaymentMethod) ?? 'card',
    purposeCode: row.purpose_code ?? '',
    isOutOfPocket: row.is_out_of_pocket,
    countsTowardGob: row.counts_toward_gob,
    entryDate: toDateInput(row.entry_date),
    notes: row.notes ?? '',
  };
}

export function LedgerEntryForm({ recent }: { recent: LedgerEntryRow[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<'closed' | 'create' | { edit: string }>('closed');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showFollowup, setShowFollowup] = useState(false);

  const openCreate = () => {
    setForm(emptyForm());
    setError(null);
    setShowFollowup(false);
    setMode('create');
  };

  const openEdit = (row: LedgerEntryRow) => {
    setForm(fromRow(row));
    setError(null);
    setShowFollowup(false);
    setMode({ edit: row.id });
  };

  const close = () => {
    setMode('closed');
    setError(null);
    setShowFollowup(false);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const v = preset.values;
    setForm((f) => ({
      ...f,
      entryType: v.entry_type,
      description: v.description,
      category: v.category ?? f.category,
      paymentMethod: v.payment_method ?? f.paymentMethod,
      purposeCode: v.purpose_code ?? f.purposeCode,
      isOutOfPocket: typeof v.is_out_of_pocket === 'boolean' ? v.is_out_of_pocket : f.isOutOfPocket,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Amount must be > 0');
      return;
    }
    startTransition(async () => {
      const payload = {
        entry_type: form.entryType,
        amount: amt,
        description: form.description,
        category: form.category,
        entry_date: form.entryDate,
        payment_method: form.paymentMethod,
        purpose_code: form.purposeCode || undefined,
        is_out_of_pocket: form.isOutOfPocket,
        counts_toward_gob: form.countsTowardGob,
        notes: form.notes || undefined,
      };
      const result =
        typeof mode === 'object' && 'edit' in mode
          ? await updateLedgerEntry({ id: mode.edit, ...payload })
          : await createLedgerEntry(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const isCreatingOutOfPocket = mode === 'create' && form.entryType === 'expense' && form.isOutOfPocket;
      if (isCreatingOutOfPocket) {
        setShowFollowup(true);
      } else {
        close();
      }
      router.refresh();
    });
  };

  const remove = (row: LedgerEntryRow) => {
    if (!window.confirm(`Delete ledger entry "${row.description ?? row.category ?? row.entry_type}"?`))
      return;
    startTransition(async () => {
      const result = await deleteLedgerEntry(row.id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      // If the deleted entry was the one being edited, close the editor.
      if (typeof mode === 'object' && 'edit' in mode && mode.edit === row.id) close();
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
          onClick={mode === 'closed' ? openCreate : close}
          className="inline-flex items-center gap-1 rounded bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/30 border border-emerald-400/40 min-h-[32px]"
        >
          {mode === 'closed' ? <Plus className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {mode === 'closed' ? 'New entry' : 'Collapse'}
        </button>
      </div>

      {mode !== 'closed' && (
        <form onSubmit={submit} className="space-y-3 text-xs mb-4">
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
                value={form.entryType}
                onChange={(e) => setForm((f) => ({ ...f, entryType: e.target.value as LedgerEntryType }))}
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
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Date
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300 sm:col-span-2">
              Description
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Category
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-slate-300">
              Payment method
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
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
                value={form.purposeCode}
                onChange={(e) => setForm((f) => ({ ...f, purposeCode: e.target.value }))}
                placeholder="optional"
                className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>

          {form.entryType === 'expense' && (
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isOutOfPocket}
                  onChange={(e) => setForm((f) => ({ ...f, isOutOfPocket: e.target.checked }))}
                />
                Out-of-pocket (needs reimbursement)
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={form.countsTowardGob}
                  onChange={(e) => setForm((f) => ({ ...f, countsTowardGob: e.target.checked }))}
                />
                Counts toward $400 GOB
              </label>
            </div>
          )}

          <label className="text-slate-300 block">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
              {pending ? 'Saving…' : typeof mode === 'object' && 'edit' in mode ? 'Save changes' : 'Save entry'}
            </button>
            <button
              type="button"
              onClick={close}
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
                  onClick={close}
                  className="rounded bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-slate-900 hover:bg-amber-300"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {recent.length === 0 ? (
        <p className="text-sm text-slate-400">No ledger activity yet this term.</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((r) => {
            const isEditing = typeof mode === 'object' && 'edit' in mode && mode.edit === r.id;
            return (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-2 rounded border px-3 py-2 text-xs ${
                  isEditing ? 'border-amber-400/40 bg-amber-400/5' : 'border-white/10 bg-white/5'
                }`}
              >
                <span className="flex-1 min-w-0 truncate text-slate-300">
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
                  <span className="text-slate-500"> · {formatDate(r.entry_date)}</span>
                </span>
                <span className="text-slate-200 tabular-nums">{money(r.amount)}</span>
                <button
                  onClick={() => openEdit(r)}
                  disabled={pending}
                  aria-label="Edit entry"
                  className="rounded border border-white/15 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-60 min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(r)}
                  disabled={pending}
                  aria-label="Delete entry"
                  className="rounded border border-rose-400/40 bg-rose-400/10 p-1.5 text-rose-200 hover:bg-rose-400/20 disabled:opacity-60 min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
