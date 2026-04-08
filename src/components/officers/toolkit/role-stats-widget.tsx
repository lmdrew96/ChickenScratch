'use client';

import { BarChart3 } from 'lucide-react';
import type { RoleStats } from '@/lib/data/toolkit-queries';

type StatCard = {
  label: string;
  value: number;
  color: string;
};

function buildStatCards(stats: RoleStats): StatCard[] {
  const cards: StatCard[] = [
    { label: 'Submissions this month', value: stats.submissionsThisMonth, color: 'text-[var(--accent)]' },
    { label: 'Pending reviews', value: stats.pendingReviews, color: 'text-amber-400' },
  ];

  if (stats.publishedPieces != null) {
    cards.push({ label: 'Published pieces', value: stats.publishedPieces, color: 'text-emerald-400' });
  }
  if (stats.upcomingMeetings != null) {
    cards.push({ label: 'Upcoming meetings', value: stats.upcomingMeetings, color: 'text-blue-400' });
  }
  if (stats.openTasks != null) {
    cards.push({ label: 'Open tasks', value: stats.openTasks, color: 'text-blue-400' });
  }
  if (stats.totalUsers != null) {
    cards.push({ label: 'Total users', value: stats.totalUsers, color: 'text-blue-400' });
  }

  return cards;
}

export function RoleStatsWidget({ stats }: { stats: RoleStats }) {
  const cards = buildStatCards(stats);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-400" />
        Stats
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs uppercase tracking-wider text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
