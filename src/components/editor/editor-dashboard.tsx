'use client';

import { useMemo, useState } from 'react';

export type EditorDashboardProps = {
  submissions: Array<{
    id: string;
    title: string | null;
    type?: string | null;
    status?: string | null;
    created_at?: string | null;
    owner?: { name?: string | null; email?: string | null; role?: string | null } | null;
  }>;
  editors: Array<{ id: string; name: string | null; email: string | null; role: string | null }>;
  viewerName: string;
};

export function EditorDashboard({ submissions, editors, viewerName }: EditorDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(submissions?.[0]?.id ?? null);

  const filtered = useMemo(() => {
    if (!Array.isArray(submissions)) return [];
    if (statusFilter === 'all') return submissions;
    return submissions.filter((s) => (s.status ?? 'submitted') === statusFilter);
  }, [submissions, statusFilter]);

  const selected = useMemo(() => filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null, [filtered, selectedId]);

  const statuses = ['all', 'submitted', 'in_review', 'needs_revision', 'accepted', 'declined', 'published'] as const;

  return (
    <div className="grid gap-4 md:grid-cols-[360px_1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white/90">Hello, {viewerName}</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
          >
            {statuses.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
          {filtered.length === 0 && (
            <li className="p-3 text-sm text-white/60">No submissions match that filter.</li>
          )}
          {filtered.map((s) => (
            <li
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`cursor-pointer p-3 transition hover:bg-white/5 ${selected?.id === s.id ? 'bg-white/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white">{s.title ?? '(untitled)'}</div>
                  <div className="text-xs text-white/60">
                    {(s.type ?? 'writing').toString()} • {(s.status ?? 'submitted').toString()}
                  </div>
                </div>
                <div className="text-xs text-white/50 text-right">
                  {s.owner?.name ?? s.owner?.email ?? 'unknown author'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        {!selected ? (
          <p className="text-sm text-white/70">Select a submission to view details.</p>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xl font-medium text-white">{selected.title ?? '(untitled)'}</h3>
            <div className="text-xs text-white/70">
              {(selected.type ?? 'writing').toString()} • {(selected.status ?? 'submitted').toString()}
            </div>
            <div className="text-sm text-white/80">
              <span className="text-white/60">Author:</span> {selected.owner?.name ?? selected.owner?.email ?? 'unknown'}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <button className="rounded-md border border-emerald-700/40 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-900/40">
                Accept
              </button>
              <button className="rounded-md border border-amber-700/40 bg-amber-900/30 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/40">
                Needs revision
              </button>
              <button className="rounded-md border border-rose-700/40 bg-rose-900/30 px-3 py-2 text-sm text-rose-200 hover:bg-rose-900/40">
                Decline
              </button>
              <button className="rounded-md border border-cyan-700/40 bg-cyan-900/30 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-900/40">
                Assign editor
              </button>
            </div>

            <div className="mt-4 text-xs text-white/60">
              * Buttons are placeholders; we’ll wire them to server actions next.
            </div>

            <div className="mt-6">
              <h4 className="mb-2 text-sm font-medium text-white">Editors</h4>
              <ul className="grid gap-1">
                {editors.map((e) => (
                  <li key={e.id} className="text-xs text-white/70">
                    {e.name ?? e.email} — {e.role}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorDashboard;
