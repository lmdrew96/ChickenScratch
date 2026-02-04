import { eq, gte, count, arrayContains, arrayOverlaps, inArray } from 'drizzle-orm';

import PageHeader from '@/components/shell/page-header';
import { requireOfficerRole } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { userRoles, profiles, submissions } from '@/lib/db/schema';
import { MeetingScheduler } from '@/components/officers/meeting-scheduler';
import { TaskManager } from '@/components/officers/task-manager';
import { Announcements } from '@/components/officers/announcements';
import { AdminTools } from '@/components/officers/admin-tools';
import { StatsDashboard } from '@/components/officers/stats-dashboard';

export default async function OfficersPage() {
  const { profile } = await requireOfficerRole('/officers');
  const database = db();

  // Fetch officers for task assignment
  const officerRoleRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(
      arrayContains(userRoles.roles, ['officer'])
    );

  // Also fetch by positions
  const officerPositionRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(
      arrayOverlaps(userRoles.positions, ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'])
    );

  const officerUserIds = [...new Set([
    ...officerRoleRows.map(r => r.user_id),
    ...officerPositionRows.map(r => r.user_id),
  ])];

  let officerProfiles: { id: string; name: string | null; email: string | null }[] = [];
  if (officerUserIds.length > 0) {
    officerProfiles = await database
      .select({ id: profiles.id, name: profiles.name, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.id, officerUserIds));
  }

  interface OfficerProfile {
    id: string;
    display_name: string;
    email: string;
  }

  const officersList = officerProfiles
    .map((p) => ({
      id: p.id,
      display_name: p.name || '',
      email: p.email || '',
    }))
    .filter((o): o is OfficerProfile => !!o.id && (!!o.display_name || !!o.email));

  // Check if user has admin access (BBEG or Dictator-in-Chief)
  const userRoleResult = await database
    .select({ positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const userRole = userRoleResult[0];
  const hasAdminAccess = userRole?.positions?.some((p: string) =>
    ['BBEG', 'Dictator-in-Chief'].includes(p)
  );

  // Fetch stats
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    submissionsThisMonthResult,
    pendingReviewsResult,
    publishedPiecesResult,
    activeCommitteeResult,
    totalUsersResult,
    committeeMembersResult,
    pendingSubmissionsResult,
  ] = await Promise.all([
    database.select({ count: count() }).from(submissions).where(gte(submissions.created_at, firstDayOfMonth)),
    database.select({ count: count() }).from(submissions).where(eq(submissions.status, 'submitted')),
    database.select({ count: count() }).from(submissions).where(eq(submissions.published, true)),
    database.select({ count: count() }).from(userRoles).where(arrayContains(userRoles.roles, ['committee'])),
    database.select({ count: count() }).from(profiles),
    database.select({ count: count() }).from(userRoles).where(arrayContains(userRoles.roles, ['committee'])),
    database.select({ count: count() }).from(submissions).where(eq(submissions.status, 'submitted')),
  ]);

  const stats = {
    submissionsThisMonth: submissionsThisMonthResult[0]?.count || 0,
    pendingReviews: pendingReviewsResult[0]?.count || 0,
    publishedPieces: publishedPiecesResult[0]?.count || 0,
    activeCommittee: activeCommitteeResult[0]?.count || 0,
  };

  const adminStats = hasAdminAccess
    ? {
        totalUsers: totalUsersResult[0]?.count || 0,
        committeeMembers: committeeMembersResult[0]?.count || 0,
        pendingSubmissions: pendingSubmissionsResult[0]?.count || 0,
      }
    : undefined;

  return (
    <div className="space-y-8">
      <PageHeader title="Officers Dashboard" />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2">
          Welcome to the Officers Dashboard
        </h2>
        <p className="text-sm text-slate-300">
          Coordinate team activities, manage tasks, and oversee operations
        </p>
      </div>

      {/* Stats Dashboard */}
      <StatsDashboard stats={stats} />

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Meeting Scheduler */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <MeetingScheduler userId={profile.id} />
          </div>

          {/* Announcements */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <Announcements />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Admin Tools */}
          {hasAdminAccess && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
              <AdminTools hasAdminAccess={hasAdminAccess} stats={adminStats} />
            </div>
          )}
        </div>
      </div>

      {/* Full Width Task Manager */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <TaskManager officers={officersList} />
      </div>
    </div>
  );
}
