'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import type { SubmissionSummary } from '@/lib/data/toolkit-queries';

const typeColors: Record<string, string> = {
  poetry: 'bg-purple-500/20 text-purple-300',
  prose: 'bg-blue-500/20 text-blue-300',
  art: 'bg-emerald-500/20 text-emerald-300',
};

const statusLabels: Record<string, string> = {
  pending_coordinator: 'Awaiting coordinator',
  with_coordinator: 'With coordinator',
  coordinator_approved: 'Approved',
  changes_requested: 'Changes requested',
  proofreader_committed: 'In proofreading',
  lead_design_committed: 'In design',
};

function timeAgo(date: Date | null): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function SubmissionsWidget({ submissions }: { submissions: SubmissionSummary[] }) {
  const displayed = submissions.slice(0, 5);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-amber-400" />
        Pending Submissions
      </h3>

      {displayed.length === 0 ? (
        <p className="text-sm text-slate-400">No submissions in the pipeline — time to promote!</p>
      ) : (
        <div className="space-y-3">
          {displayed.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-white truncate">{sub.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${typeColors[sub.type] ?? 'bg-white/10 text-slate-400'}`}>
                  {sub.type}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{sub.owner_name ?? 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  <span>{statusLabels[sub.committee_status ?? ''] ?? 'New'}</span>
                  <span className="text-slate-500">{timeAgo(sub.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <Link href="/committee" className="text-sm text-[var(--accent)] hover:underline">
          View full pipeline &rarr;
        </Link>
      </div>
    </div>
  );
}
