'use client';

import { Clock } from 'lucide-react';

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

export function RecurringTimeline({ tasks }: { tasks: { cadence: string; tasks: string }[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-400" />
        Recurring Responsibilities
      </h3>
      <div className="relative ml-3">
        {tasks.map((item, i) => {
          const dotColor = cadenceColors[item.cadence] ?? 'bg-slate-400';
          const isLast = i === tasks.length - 1;
          return (
            <div key={i} className="flex gap-4 pb-6 last:pb-0">
              {/* Timeline dot + connector */}
              <div className="relative flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${dotColor} shrink-0 mt-1`} />
                {!isLast && (
                  <div className="w-px flex-1 bg-white/10" />
                )}
              </div>
              {/* Content */}
              <div className="pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  {item.cadence}
                </p>
                <p className="text-sm text-slate-400">{item.tasks}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
