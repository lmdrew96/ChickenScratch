import { redirect } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/shell/page-header';
import { requireUser } from '@/lib/auth/guards';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { db } from '@/lib/supabase/db';
import { SubmissionsListWithDelete } from '@/components/editor/submissions-list-with-delete';
import { ExportReportButton } from '@/components/editor/export-report-button';
import type { Submission } from '@/types/database';

interface SubmissionWithAuthor extends Submission {
  author_name?: string;
}

// Committee status type
type CommitteeStatus = Submission['committee_status'];

// Helper function to format committee status
function formatCommitteeStatus(status: CommitteeStatus): string {
  if (!status) return 'New';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to get status color
function getStatusColor(status: CommitteeStatus): string {
  const colors: Record<string, string> = {
    pending_coordinator: 'bg-yellow-900/60 text-yellow-100 border-yellow-500/70',
    with_coordinator: 'bg-blue-900/60 text-blue-100 border-blue-500/60',
    coordinator_approved: 'bg-emerald-900/60 text-emerald-100 border-emerald-500/70',
    coordinator_declined: 'bg-rose-900/60 text-rose-100 border-rose-500/70',
    with_proofreader: 'bg-purple-900/60 text-purple-100 border-purple-500/70',
    proofreader_committed: 'bg-indigo-900/60 text-indigo-100 border-indigo-500/70',
    with_lead_design: 'bg-pink-900/60 text-pink-100 border-pink-500/70',
    lead_design_committed: 'bg-cyan-900/60 text-cyan-100 border-cyan-500/70',
    with_editor_in_chief: 'bg-amber-900/60 text-amber-100 border-amber-500/70',
    published: 'bg-green-900/60 text-green-100 border-green-500/70',
  };
  return status ? colors[status] || 'bg-slate-800/70 text-slate-200 border-slate-500/50' : 'bg-slate-800/70 text-slate-200 border-slate-500/50';
}

// Calculate days since last update
function getDaysSince(date: string | null): number {
  if (!date) return 0;
  const now = new Date();
  const updated = new Date(date);
  const diffTime = Math.abs(now.getTime() - updated.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default async function EditorInChiefDashboard() {
  // Require user to be logged in
  await requireUser('/editor');

  // Get user role from user_roles table
  const userRole = await getCurrentUserRole();

  // Check if user has Editor-in-Chief position
  const isEditorInChief = userRole?.positions?.includes('Editor-in-Chief');

  if (!isEditorInChief) {
    // Redirect to appropriate page based on their role
    if (userRole?.roles?.includes('committee')) {
      redirect('/committee');
    } else {
      redirect('/mine');
    }
  }

  // Fetch all submissions with author names
  const supabase = db();
  let submissions: SubmissionWithAuthor[] = [];

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
    } else if (data) {
      // Fetch author names for all submissions
      const ownerIds = [...new Set(data.map((s) => s.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', ownerIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      submissions = data.map((submission) => ({
        ...submission,
        author_name: profileMap.get(submission.owner_id) || undefined,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
  }

  // Check if user is admin (BBEG or Dictator-in-Chief)
  const isAdmin = !!(
    userRole?.positions?.includes('BBEG') ||
    userRole?.positions?.includes('Dictator-in-Chief')
  );

  // Calculate metrics
  const totalSubmissions = submissions.length;
  const pendingReview = submissions.filter(
    (s) => !s.committee_status || s.committee_status === 'pending_coordinator'
  ).length;
  const inProgress = submissions.filter(
    (s) =>
      s.committee_status &&
      ['with_coordinator', 'with_proofreader', 'with_lead_design'].includes(s.committee_status)
  ).length;
  const published = submissions.filter((s) => s.status === 'published').length;

  // Workflow status breakdown
  const statusCounts: Record<string, number> = {
    new: submissions.filter((s) => !s.committee_status).length,
    pending_coordinator: submissions.filter((s) => s.committee_status === 'pending_coordinator').length,
    with_coordinator: submissions.filter((s) => s.committee_status === 'with_coordinator').length,
    coordinator_approved: submissions.filter((s) => s.committee_status === 'coordinator_approved').length,
    with_proofreader: submissions.filter((s) => s.committee_status === 'with_proofreader').length,
    proofreader_committed: submissions.filter((s) => s.committee_status === 'proofreader_committed').length,
    with_lead_design: submissions.filter((s) => s.committee_status === 'with_lead_design').length,
    lead_design_committed: submissions.filter((s) => s.committee_status === 'lead_design_committed').length,
    with_editor_in_chief: submissions.filter((s) => s.committee_status === 'with_editor_in_chief').length,
    published: submissions.filter((s) => s.status === 'published').length,
  };

  // Bottleneck detection - submissions stuck for >7 days
  const bottlenecks = submissions
    .filter((s) => getDaysSince(s.updated_at) > 7 && s.status !== 'published')
    .sort((a, b) => getDaysSince(b.updated_at) - getDaysSince(a.updated_at));

  // Find stage with most backlog
  const maxBacklog = Math.max(...Object.values(statusCounts));
  const backlogStage = Object.entries(statusCounts).find(([, count]) => count === maxBacklog)?.[0];

  // Recent activity - get last 10 submissions with status changes
  const recentActivity = submissions
    .filter((s) => s.updated_at)
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
    .slice(0, 10);

  // Submissions by type
  const writingCount = submissions.filter((s) => s.type === 'writing').length;
  const visualCount = submissions.filter((s) => s.type === 'visual').length;

  // Genre distribution
  const genreCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    if (s.genre) {
      genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Editor-in-Chief Dashboard" />

      {/* Key Metrics Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="text-sm font-medium text-slate-300">Total Submissions</div>
          <div className="mt-2 text-4xl font-bold text-[var(--text)]">{totalSubmissions}</div>
          <div className="mt-1 text-xs text-slate-400">All time</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="text-sm font-medium text-slate-300">Pending Review</div>
          <div className="mt-2 text-4xl font-bold text-yellow-400">{pendingReview}</div>
          <div className="mt-1 text-xs text-slate-400">Awaiting coordinator</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="text-sm font-medium text-slate-300">In Progress</div>
          <div className="mt-2 text-4xl font-bold text-blue-400">{inProgress}</div>
          <div className="mt-1 text-xs text-slate-400">Active workflow</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="text-sm font-medium text-slate-300">Published</div>
          <div className="mt-2 text-4xl font-bold text-green-400">{published}</div>
          <div className="mt-1 text-xs text-slate-400">Live on site</div>
        </div>
      </div>

      {/* Workflow Status Breakdown */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
        <h2 className="mb-6 text-xl font-semibold text-[var(--text)]">Workflow Status Breakdown</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getStatusColor(status as CommitteeStatus)}`}
                >
                  {formatCommitteeStatus(status as CommitteeStatus)}
                </span>
                <span className="text-2xl font-bold text-[var(--text)]">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottleneck Detection */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
        <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">Bottleneck Detection</h2>
        
        {backlogStage && (
          <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-900/20 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-semibold text-amber-200">Highest Backlog</div>
                <div className="text-sm text-amber-300">
                  {formatCommitteeStatus(backlogStage as CommitteeStatus)} has {maxBacklog} submissions
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-300">
            Submissions stuck for &gt;7 days ({bottlenecks.length})
          </h3>
          {bottlenecks.length === 0 ? (
            <p className="text-sm text-slate-400">No bottlenecks detected! 🎉</p>
          ) : (
            <div className="space-y-2">
              {bottlenecks.slice(0, 5).map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-[var(--text)]">{submission.title}</p>
                      <p className="text-xs text-slate-300">
                        {formatCommitteeStatus(submission.committee_status)} • {getDaysSince(submission.updated_at)} days
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${getStatusColor(submission.committee_status)}`}
                    >
                      {formatCommitteeStatus(submission.committee_status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity Feed */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400">No recent activity</p>
            ) : (
              recentActivity.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="text-sm font-medium text-[var(--text)]">{submission.title}</p>
                  <p className="text-xs text-slate-300">
                    Status: {formatCommitteeStatus(submission.committee_status)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {submission.updated_at
                      ? new Date(submission.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Submissions by Type */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">Submissions by Type</h2>
          
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Writing</span>
                <span className="text-2xl font-bold text-[var(--text)]">{writingCount}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${totalSubmissions > 0 ? (writingCount / totalSubmissions) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Visual Art</span>
                <span className="text-2xl font-bold text-[var(--text)]">{visualCount}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${totalSubmissions > 0 ? (visualCount / totalSubmissions) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {Object.keys(genreCounts).length > 0 && (
            <>
              <h3 className="mb-3 mt-6 text-sm font-medium text-slate-300">Genre Distribution</h3>
              <div className="space-y-2">
                {Object.entries(genreCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([genre, count]) => (
                    <div key={genre} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{genre}</span>
                      <span className="font-semibold text-[var(--text)]">{count}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Quick Actions */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
        <h2 className="mb-4 text-xl font-semibold text-[var(--text)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/committee"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-[var(--text)] transition-colors hover:bg-white/10"
          >
            View Full Committee Workflow
          </Link>
          <ExportReportButton />
        </div>
      </section>

      {/* All Submissions List with Delete Functionality */}
      <SubmissionsListWithDelete submissions={submissions} isAdmin={isAdmin} />
    </div>
  );
}
