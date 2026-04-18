'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { deleteSignup } from '@/lib/actions/events';
import type { SignupRow } from '@/lib/data/event-queries';
import type { SignupCategory } from '@/lib/validations/event-signup';

function formatCreatedAt(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

export function SignupsTable({
  signups,
  categoryLabels,
}: {
  signups: SignupRow[];
  categoryLabels: Record<SignupCategory, string>;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = (row: SignupRow) => {
    if (!window.confirm(`Delete ${row.name}'s signup for "${row.item}"?`)) return;
    setDeletingId(row.id);
    startTransition(async () => {
      const result = await deleteSignup(row.id);
      setDeletingId(null);
      if (!result.ok) {
        notify({ title: 'Delete failed', description: result.error, variant: 'error' });
        return;
      }
      notify({ title: 'Signup deleted', variant: 'success' });
      router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Name</th>
            <th scope="col" className="px-4 py-3 font-semibold">Email</th>
            <th scope="col" className="px-4 py-3 font-semibold">Item</th>
            <th scope="col" className="px-4 py-3 font-semibold">Category</th>
            <th scope="col" className="px-4 py-3 font-semibold">Notes</th>
            <th scope="col" className="px-4 py-3 font-semibold">Submitted</th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {signups.map((s) => (
            <tr key={s.id} className="align-top">
              <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
              <td className="px-4 py-3 text-slate-300">
                <a href={`mailto:${s.email}`} className="hover:underline">
                  {s.email}
                </a>
              </td>
              <td className="px-4 py-3 text-white">{s.item}</td>
              <td className="px-4 py-3 text-slate-300">{categoryLabels[s.category]}</td>
              <td className="px-4 py-3 text-slate-300 whitespace-pre-wrap">
                {s.notes ? s.notes : <span className="text-slate-500">—</span>}
              </td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                {formatCreatedAt(s.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(s)}
                  disabled={pending && deletingId === s.id}
                  aria-label={`Delete ${s.name}'s signup`}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  {pending && deletingId === s.id ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
