import { MyTasksWidget } from './my-tasks-widget';
import { SubmissionsWidget } from './submissions-widget';
import { NextMeetingWidget } from './next-meeting-widget';
import { RoleStatsWidget } from './role-stats-widget';
import type { TaskSummary, SubmissionSummary, MeetingSummary, RoleStats, AnnouncementSummary } from '@/lib/data/toolkit-queries';
import { Megaphone } from 'lucide-react';

type ToolkitDashboardProps = {
  tasks: TaskSummary[];
  submissions: SubmissionSummary[];
  nextMeeting: MeetingSummary | null;
  stats: RoleStats;
  announcements: AnnouncementSummary[];
  slug: string;
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

export function ToolkitDashboard({ tasks, submissions, nextMeeting, stats, announcements, slug }: ToolkitDashboardProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left column */}
      <div className="space-y-8">
        <MyTasksWidget tasks={tasks} />
        <SubmissionsWidget submissions={submissions} />
      </div>

      {/* Right column */}
      <div className="space-y-8">
        <RoleStatsWidget stats={stats} />
        <NextMeetingWidget meeting={nextMeeting} />

        {/* Recent announcements */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-purple-400" />
            Recent Announcements
          </h3>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-400">No recent announcements.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm text-slate-300 line-clamp-2">{a.message}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>{a.author_name ?? 'Unknown'}</span>
                    <span>{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
