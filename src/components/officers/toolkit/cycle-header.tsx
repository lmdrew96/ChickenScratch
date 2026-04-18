import { Feather, CalendarClock } from 'lucide-react';
import type { IssueCycleState } from '@/lib/data/issue-cycle';

function formatIssueLabel(state: IssueCycleState): string {
  if (state.issueTitle) return state.issueTitle;
  if (state.issueVolume != null && state.issueNumber != null) {
    return `Vol ${state.issueVolume} · Issue ${state.issueNumber}`;
  }
  if (state.publishDate) {
    return state.publishDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' Issue';
  }
  return 'Next Issue';
}

function formatDeadline(days: number | null, date: Date | null): { text: string; tone: 'info' | 'warn' | 'danger' | 'past' } {
  if (days == null || !date) return { text: 'No submission deadline set', tone: 'info' };
  if (days < 0) return { text: `Submissions closed ${Math.abs(days)}d ago`, tone: 'past' };
  if (days === 0) return { text: 'Submissions close today', tone: 'danger' };
  if (days <= 3) return { text: `Submissions close in ${days}d`, tone: 'danger' };
  if (days <= 7) return { text: `Submissions close in ${days}d`, tone: 'warn' };
  return { text: `Submissions close in ${days}d`, tone: 'info' };
}

export function CycleHeader({ state }: { state: IssueCycleState }) {
  if (!state.hasActiveIssue) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <Feather className="h-4 w-4 text-amber-400" />
        <span>No active Chicken Scratch issue configured.</span>
      </div>
    );
  }

  const label = formatIssueLabel(state);
  const weekText =
    state.weekOfCycle != null && state.totalWeeks != null
      ? `Week ${state.weekOfCycle} of ${state.totalWeeks}`
      : null;
  const deadline = formatDeadline(state.daysUntilSubmissionsClose, state.submissionsCloseAt);

  const toneClass = {
    info: 'text-slate-300',
    warn: 'text-amber-300',
    danger: 'text-rose-300',
    past: 'text-slate-500',
  }[deadline.tone];

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <div className="flex items-center gap-2 text-amber-200 font-semibold">
        <Feather className="h-4 w-4" />
        <span>{label}</span>
      </div>
      {weekText && (
        <>
          <span className="text-slate-500">·</span>
          <span className="text-slate-200">{weekText}</span>
        </>
      )}
      <span className="text-slate-500">·</span>
      <div className={`flex items-center gap-1.5 ${toneClass}`}>
        <CalendarClock className="h-4 w-4" />
        <span>{deadline.text}</span>
      </div>
    </div>
  );
}
