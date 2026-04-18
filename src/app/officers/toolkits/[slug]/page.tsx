import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { officerToolkits } from '@/lib/data/toolkits';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getSiteConfigValue } from '@/lib/site-config';
import { db } from '@/lib/db';
import { userRoles } from '@/lib/db/schema';
import {
  getMyTasks,
  getPendingSubmissions,
  getNextMeeting,
  getRoleStats,
  getRecentAnnouncements,
} from '@/lib/data/toolkit-queries';
import PageHeader from '@/components/shell/page-header';
import { ToolkitDashboard } from '@/components/officers/toolkit/toolkit-dashboard';
import { QuickActions } from '@/components/officers/toolkit/quick-actions';
import { StatefulRecurringTasks } from '@/components/officers/toolkit/stateful-recurring-tasks';
import { RoleReference } from '@/components/officers/toolkit/role-reference';
import { CycleHeader } from '@/components/officers/toolkit/cycle-header';
import { getCompletedTaskIds } from '@/lib/actions/recurring-tasks';
import { getIssueCycleState } from '@/lib/data/issue-cycle';

export default async function ToolkitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { profile } = await requireOfficerRole(`/officers/toolkits/${slug}`);

  const toolkit = officerToolkits.find((t) => t.slug === slug);
  if (!toolkit) {
    notFound();
  }

  const database = db();

  // Get the user's position from user_roles
  const userRoleResult = await database
    .select({ positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const isMyRole = userRoleResult[0]?.positions?.includes(toolkit.position) ?? false;

  // Fetch live data in parallel
  const [myTasks, submissions, nextMeeting, stats, announcements, cycleState] = await Promise.all([
    getMyTasks(profile.id),
    getPendingSubmissions(),
    getNextMeeting(),
    getRoleStats(slug),
    getRecentAnnouncements(3),
    getIssueCycleState(),
  ]);

  // Resolve quick link URLs from site_config
  const linksWithUrls = await Promise.all(
    toolkit.quickLinks.map(async (link) => {
      const url = await getSiteConfigValue(link.configKey);
      return { ...link, url };
    })
  );

  // Completed recurring-task IDs (current cycle only)
  const allTaskIds = toolkit.recurringTasks.flatMap((g) => g.items.map((i) => i.id));
  const completedSet = await getCompletedTaskIds(profile.id, allTaskIds);
  const completedIds = Array.from(completedSet);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${toolkit.title} Toolkit`}
        description={toolkit.roleName}
        showBackButton
        backButtonHref="/officers"
        backButtonLabel="Back to Officers"
      />

      <CycleHeader state={cycleState} />

      {isMyRole && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 flex items-center gap-2">
          <span className="text-[var(--accent)] text-sm font-semibold">&#x2726; This is your role</span>
          <span className="text-sm text-slate-300">&mdash; your personal command center</span>
        </div>
      )}

      <ToolkitDashboard
        tasks={myTasks}
        submissions={submissions}
        nextMeeting={nextMeeting}
        stats={stats}
        announcements={announcements}
        slug={slug}
      />

      <QuickActions actions={toolkit.quickActions} />

      <StatefulRecurringTasks groups={toolkit.recurringTasks} completedIds={completedIds} />

      <RoleReference
        overview={toolkit.overview}
        responsibilities={toolkit.responsibilities}
        handoffChecklist={toolkit.handoffChecklist}
        quickLinks={linksWithUrls}
      />
    </div>
  );
}
