'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { deletePerformanceSignup } from '@/lib/actions/events';
import type { PerformanceRow } from '@/lib/data/event-queries';
import {
  PERFORMANCE_KIND_LABEL,
  type PerformanceKind,
} from '@/lib/validations/event-performance-signup';

function formatCreatedAt(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

export function PerformancesTable({ performances }: { performances: PerformanceRow[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = (row: PerformanceRow) => {
    if (!window.confirm(`Delete ${row.name}'s signup for "${row.piece_title}"?`)) return;
    setDeletingId(row.id);
    startTransition(async () => {
      const result = await deletePerformanceSignup(row.id);
      setDeletingId(null);
      if (!result.ok) {
        notify({ title: 'Delete failed', description: result.error, variant: 'error' });
        return;
      }
      notify({ title: 'Performance signup deleted', variant: 'success' });
      router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Name</th>
            <th scope="col" className="px-4 py-3 font-semibold">Email</th>
            <th scope="col" className="px-4 py-3 font-semibold">Type</th>
            <th scope="col" className="px-4 py-3 font-semibold">Piece</th>
            <th scope="col" className="px-4 py-3 font-semibold">Min</th>
            <th scope="col" className="px-4 py-3 font-semibold">Content warnings</th>
            <th scope="col" className="px-4 py-3 font-semibold">Notes</th>
            <th scope="col" className="px-4 py-3 font-semibold">Submitted</th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {performances.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
              <td className="px-4 py-3 text-slate-300">
                <a href={`mailto:${p.email}`} className="hover:underline">
                  {p.email}
                </a>
              </td>
              <td className="px-4 py-3 text-slate-300">
                {PERFORMANCE_KIND_LABEL[p.kind as PerformanceKind]}
              </td>
              <td className="px-4 py-3 text-white">{p.piece_title}</td>
              <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                {p.estimated_minutes}
              </td>
              <td className="px-4 py-3 text-slate-300 whitespace-pre-wrap">
                {p.content_warnings ? p.content_warnings : <span className="text-slate-500">—</span>}
              </td>
              <td className="px-4 py-3 text-slate-300 whitespace-pre-wrap">
                {p.notes ? p.notes : <span className="text-slate-500">—</span>}
              </td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                {formatCreatedAt(p.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  disabled={pending && deletingId === p.id}
                  aria-label={`Delete ${p.name}'s performance signup`}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  {pending && deletingId === p.id ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
