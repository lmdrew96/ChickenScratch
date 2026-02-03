import PageHeader from '@/components/shell/page-header';
import { requireOfficerRole } from '@/lib/auth/guards';
import { db } from '@/lib/supabase/db';
import { MeetingScheduler } from '@/components/officers/meeting-scheduler';
import { TaskManager } from '@/components/officers/task-manager';
import { Announcements } from '@/components/officers/announcements';
import { AdminTools } from '@/components/officers/admin-tools';
import { StatsDashboard } from '@/components/officers/stats-dashboard';

export default async function OfficersPage() {
  const { profile } = await requireOfficerRole('/officers');
  const supabase = db();

  // Fetch officers for task assignment
  const { data: officerRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .or('roles.cs.{"officer"},positions.ov.{BBEG,Dictator-in-Chief,Scroll Gremlin,Chief Hoarder,PR Nightmare}');

  const officerUserIds = officerRoles?.map((r) => r.user_id) || [];

  const { data: officerProfiles } = officerUserIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', officerUserIds)
    : { data: [] };

  interface OfficerProfile {
    id: string;
    display_name: string;
    email: string;
  }

  const officersList = (officerProfiles || [])
    .map((p) => ({
      id: p.id,
      display_name: p.name || '',
      email: p.email || '',
    }))
    .filter((o): o is OfficerProfile => !!o.id && (!!o.display_name || !!o.email));

  // Check if user has admin access (BBEG or Dictator-in-Chief)
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('positions')
    .eq('user_id', profile.id)
    .single();

  const hasAdminAccess = userRole?.positions?.some((p: string) =>
    ['BBEG', 'Dictator-in-Chief'].includes(p)
  );

  // Fetch stats
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    { count: submissionsThisMonth },
    { count: pendingReviews },
    { count: publishedPieces },
    { count: activeCommittee },
    { count: totalUsers },
    { count: committeeMembers },
    { count: pendingSubmissions },
  ] = await Promise.all([
    supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString()),
    supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted'),
    supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('published', true),
    supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .or('roles.cs.{"committee"},positions.ov.{Editor-in-Chief,Submissions Coordinator,Proofreader,Lead Design}'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .or('roles.cs.{"committee"},positions.ov.{Editor-in-Chief,Submissions Coordinator,Proofreader,Lead Design}'),
    supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted'),
  ]);

  const stats = {
    submissionsThisMonth: submissionsThisMonth || 0,
    pendingReviews: pendingReviews || 0,
    publishedPieces: publishedPieces || 0,
    activeCommittee: activeCommittee || 0,
  };

  const adminStats = hasAdminAccess
    ? {
        totalUsers: totalUsers || 0,
        committeeMembers: committeeMembers || 0,
        pendingSubmissions: pendingSubmissions || 0,
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
