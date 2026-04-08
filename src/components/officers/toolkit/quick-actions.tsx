'use client';

import Link from 'next/link';
import { Calendar, Megaphone, FileText, ListTodo, Users, BookOpen, Zap } from 'lucide-react';
import type { QuickAction } from '@/lib/data/toolkits';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Megaphone,
  FileText,
  ListTodo,
  Users,
  BookOpen,
};

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-[var(--accent)]" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = iconMap[action.icon];
          return (
            <Link
              key={action.label}
              href={action.href ?? '#'}
              className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-[var(--accent)]/30 transition-all hover:-translate-y-1 block"
            >
              <div className="flex items-center gap-3 mb-1">
                {Icon && <Icon className="h-5 w-5 text-[var(--accent)]" />}
                <span className="font-semibold text-white">{action.label}</span>
              </div>
              <p className="text-sm text-slate-400">{action.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
