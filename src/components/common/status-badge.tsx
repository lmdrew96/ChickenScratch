import { cn } from '@/lib/utils';
import { formatStatus, type SubmissionStatus } from '@/lib/constants';

const statusStyles: Record<SubmissionStatus, string> = {
  submitted: 'bg-slate-800/70 text-slate-200 border-slate-500/50',
  in_review: 'bg-blue-900/60 text-blue-100 border-blue-500/60',
  needs_revision: 'bg-amber-900/60 text-amber-100 border-amber-500/70',
  accepted: 'bg-emerald-900/60 text-emerald-100 border-emerald-500/70',
  declined: 'bg-rose-900/60 text-rose-100 border-rose-500/70',
  published: 'bg-purple-900/60 text-purple-100 border-purple-500/70',
};

const fallbackStyle = 'bg-slate-800/70 text-slate-200 border-slate-500/50';

export function StatusBadge({ status, className }: { status: string | null; className?: string }) {
  const style = (status && status in statusStyles) ? statusStyles[status as SubmissionStatus] : fallbackStyle;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase', style, className)}>
      {formatStatus(status)}
    </span>
  );
}
