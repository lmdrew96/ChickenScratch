'use client';

import { useState, useTransition } from 'react';
import { Clock, Check } from 'lucide-react';
import { toggleRecurringTask } from '@/lib/actions/recurring-tasks';
import type { RecurringTaskGroup } from '@/lib/data/toolkits';

const cadenceColors: Record<string, string> = {
  'Per Meeting': 'bg-emerald-400',
  'Weekly': 'bg-emerald-400',
  'Bi-weekly': 'bg-blue-400',
  'Per Event': 'bg-blue-400',
  'Monthly': 'bg-amber-400',
  'Per Issue': 'bg-amber-400',
  'Ongoing': 'bg-amber-400',
  'Per Semester': 'bg-purple-400',
  'Annually': 'bg-purple-400',
};

const cadenceBlurb: Record<string, string> = {
  'Per Meeting': 'Resets after the next meeting',
  'Weekly': 'Resets Monday',
  'Bi-weekly': 'Resets every other week',
  'Per Event': 'Resets weekly',
  'Monthly': 'Resets on the 1st',
  'Per Issue': 'Resets when a new issue starts',
  'Ongoing': 'Resets weekly',
  'Per Semester': 'Resets each semester',
  'Annually': 'Resets in January',
};

type Props = {
  groups: RecurringTaskGroup[];
  completedIds: string[];
};

export function StatefulRecurringTasks({ groups, completedIds }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(() => new Set(completedIds));
  const [pending, startTransition] = useTransition();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const onToggle = (taskId: string) => {
    setPendingIds((p) => new Set(p).add(taskId));
    // optimistic
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
    startTransition(async () => {
      const result = await toggleRecurringTask(taskId);
      if (!result.ok) {
        // revert on error
        setCompleted((prev) => {
          const next = new Set(prev);
          if (next.has(taskId)) next.delete(taskId);
          else next.add(taskId);
          return next;
        });
      }
      setPendingIds((p) => {
        const next = new Set(p);
        next.delete(taskId);
        return next;
      });
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-400" />
        Recurring Responsibilities
      </h3>
      <div className="relative ml-1 sm:ml-3">
        {groups.map((group, i) => {
          const dotColor = cadenceColors[group.cadence] ?? 'bg-slate-400';
          const isLast = i === groups.length - 1;
          return (
            <div key={group.cadence} className="flex gap-3 sm:gap-4 pb-6 last:pb-0">
              <div className="relative flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${dotColor} shrink-0 mt-1.5`} />
                {!isLast && <div className="w-px flex-1 bg-white/10" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {group.cadence}
                  </p>
                  <p className="text-[10px] text-slate-500">{cadenceBlurb[group.cadence] ?? ''}</p>
                </div>
                <ul className="space-y-1.5">
                  {group.items.map((item) => {
                    const isDone = completed.has(item.id);
                    const isPending = pendingIds.has(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onToggle(item.id)}
                          disabled={pending && isPending}
                          className={`w-full text-left flex items-start gap-3 rounded-lg border px-3 py-2 min-h-[44px] transition-colors ${
                            isDone
                              ? 'border-emerald-400/30 bg-emerald-400/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          } ${isPending ? 'opacity-60' : ''}`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              isDone
                                ? 'bg-emerald-400 border-emerald-400 text-slate-900'
                                : 'border-white/30 bg-white/5'
                            }`}
                          >
                            {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <span
                            className={`text-sm ${
                              isDone ? 'text-slate-400 line-through' : 'text-slate-200'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
