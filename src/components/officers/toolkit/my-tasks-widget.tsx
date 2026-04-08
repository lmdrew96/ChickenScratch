'use client';

import Link from 'next/link';
import { ListTodo } from 'lucide-react';
import type { TaskSummary } from '@/lib/data/toolkit-queries';

const priorityColors: Record<string, string> = {
  urgent: 'text-red-400',
  high: 'text-amber-400',
  medium: 'text-slate-400',
  low: 'text-gray-500',
};

function relativeDate(date: Date | null): { label: string; overdue: boolean } {
  if (!date) return { label: 'No due date', overdue: false };
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, overdue: true };
  if (days === 0) return { label: 'Due today', overdue: false };
  if (days === 1) return { label: 'Due tomorrow', overdue: false };
  return { label: `Due in ${days}d`, overdue: false };
}

export function MyTasksWidget({ tasks }: { tasks: TaskSummary[] }) {
  const displayed = tasks.slice(0, 5);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <ListTodo className="h-5 w-5 text-blue-400" />
        My Tasks
      </h3>

      {displayed.length === 0 ? (
        <p className="text-sm text-slate-400">No tasks assigned — you&apos;re all caught up!</p>
      ) : (
        <div className="space-y-3">
          {displayed.map((task) => {
            const { label, overdue } = relativeDate(task.due_date);
            return (
              <div
                key={task.id}
                className={`rounded-xl border border-white/10 p-3 flex items-center justify-between gap-3 ${
                  overdue ? 'bg-red-500/10' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-lg ${priorityColors[task.priority ?? 'medium']}`}>●</span>
                  <span className="text-sm text-white truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      task.status === 'in_progress'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {task.status === 'in_progress' ? 'In progress' : 'To do'}
                  </span>
                  <span className={`text-xs ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <Link href="/officers#tasks" className="text-sm text-[var(--accent)] hover:underline">
          View all tasks &rarr;
        </Link>
      </div>
    </div>
  );
}
