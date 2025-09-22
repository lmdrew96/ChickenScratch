'use client';
import clsx from 'clsx';
import { formatStatus, type SubmissionStatus } from '@/lib/constants';
export default function StatusBadge({ status, className }:{ status: SubmissionStatus; className?: string }){
  const styles: Record<SubmissionStatus,string> = {
    draft:'bg-slate-800/70 text-slate-200 border-slate-500/50',
    submitted:'bg-slate-800/70 text-slate-200 border-slate-500/50',
    under_review:'bg-blue-900/60 text-blue-100 border-blue-500/60',
    needs_revision:'bg-amber-900/60 text-amber-100 border-amber-500/70',
    approved:'bg-emerald-900/60 text-emerald-100 border-emerald-500/70',
    not_started:'bg-slate-800/70 text-slate-200 border-slate-500/50',
    content_review:'bg-blue-900/60 text-blue-100 border-blue-500/60',
    copy_edit:'bg-violet-900/60 text-violet-100 border-violet-500/70',
    layout:'bg-fuchsia-900/60 text-fuchsia-100 border-fuchsia-500/70',
    ready_to_publish:'bg-emerald-900/60 text-emerald-100 border-emerald-500/70',
    published:'bg-green-900/70 text-green-100 border-green-500/70',
    declined:'bg-rose-900/60 text-rose-100 border-rose-500/70',
    withdrawn:'bg-slate-900/60 text-slate-300 border-slate-600/70',
  };
  const cls = styles[status] ?? 'bg-slate-800/70 text-slate-200 border-slate-500/50';
  return <span className={clsx('inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium', cls, className)}>{formatStatus(status)}</span>;
}
// keep legacy named import working
export { StatusBadge };
