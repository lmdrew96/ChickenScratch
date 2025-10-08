'use client';

import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface StatsDashboardProps {
  stats: {
    submissionsThisMonth: number;
    pendingReviews: number;
    publishedPieces: number;
    activeCommittee: number;
  };
}

export function StatsDashboard({ stats }: StatsDashboardProps) {
  const statCards = [
    {
      label: 'Submissions This Month',
      value: stats.submissionsThisMonth,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Published Pieces',
      value: stats.publishedPieces,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Active Committee',
      value: stats.activeCommittee,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        Quick Stats Dashboard
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className={`inline-flex rounded-lg ${stat.bgColor} p-2 mb-3`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
