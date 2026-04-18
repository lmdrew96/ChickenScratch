import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { officerToolkits } from '@/lib/data/toolkits';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getSiteConfigValue } from '@/lib/site-config';
import { db } from '@/lib/db';
import { userRoles } from '@/lib/db/schema';
import PageHeader from '@/components/shell/page-header';
import { QuickActions } from '@/components/officers/toolkit/quick-actions';
import { StatefulRecurringTasks } from '@/components/officers/toolkit/stateful-recurring-tasks';
import { RoleReference } from '@/components/officers/toolkit/role-reference';
import { CycleHeader } from '@/components/officers/toolkit/cycle-header';
import { ThisWeekCard } from '@/components/officers/toolkit/this-week-card';
import { SopTeaser } from '@/components/officers/toolkit/sops/sop-teaser';
import { AttendanceTaker } from '@/components/officers/toolkit/secretary/attendance-taker';
import {
  getMeetingsInAttendanceWindow,
  getActiveMembers,
  getAttendanceForMeeting,
  getVotingRightsAtRisk,
  type AttendanceRecord,
} from '@/lib/data/attendance-queries';
import { getThisWeek } from '@/lib/data/this-week';
import { listSopsForRole } from '@/lib/data/sop-queries';
import { ReimbursementPipeline } from '@/components/officers/toolkit/treasurer/reimbursement-pipeline';
import { LedgerEntryForm } from '@/components/officers/toolkit/treasurer/ledger-entry-form';
import { GobTracker } from '@/components/officers/toolkit/treasurer/gob-tracker';
import { ComplianceAlerts } from '@/components/officers/toolkit/treasurer/compliance-alerts';
import { getCompletedTaskIds } from '@/lib/actions/recurring-tasks';
import { getIssueCycleState } from '@/lib/data/issue-cycle';
import { getOpenReimbursements } from '@/lib/data/reimbursement-queries';
import { getRecentLedgerEntries, getGobSummary, getUpcomingExpenses } from '@/lib/data/ledger-queries';
import { getReceiptAgingAlerts, getCashDepositAlerts } from '@/lib/data/compliance';

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
  const adminPositions = ['Dictator-in-Chief', 'Scroll Gremlin'];
  const isAdmin = userRoleResult[0]?.positions?.some((p: string) => adminPositions.includes(p)) ?? false;

  // Fetch live data in parallel
  const [cycleState, thisWeek, sopArticles] = await Promise.all([
    getIssueCycleState(),
    getThisWeek(profile.id, slug),
    listSopsForRole(slug),
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

  // Secretary-specific widgets
  const isSecretary = slug === 'secretary';
  const [meetingsToday, members, risks] = isSecretary
    ? await Promise.all([
        getMeetingsInAttendanceWindow(),
        getActiveMembers(),
        getVotingRightsAtRisk(),
      ])
    : [[], [], []];
  const initialAttendance: Record<string, AttendanceRecord[]> = {};
  if (isSecretary) {
    const pairs = await Promise.all(
      meetingsToday.map(async (m) => [m.id, await getAttendanceForMeeting(m.id)] as const),
    );
    for (const [id, records] of pairs) initialAttendance[id] = records;
  }

  // Treasurer-specific widgets
  const isTreasurer = slug === 'treasurer';
  const [reimbursements, recentLedger, gobSummary, upcoming, receiptAlerts, cashAlerts] = isTreasurer
    ? await Promise.all([
        getOpenReimbursements(),
        getRecentLedgerEntries(20),
        getGobSummary(),
        getUpcomingExpenses(),
        getReceiptAgingAlerts(),
        getCashDepositAlerts(),
      ])
    : [[], [], null, [], [], []];

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

      <ThisWeekCard roleLabel={toolkit.title} items={thisWeek} />

      <QuickActions actions={toolkit.quickActions} />

      {isSecretary && (
        <AttendanceTaker
          meetings={meetingsToday}
          members={members}
          initialByMeeting={initialAttendance}
          risks={risks}
        />
      )}

      {isTreasurer && gobSummary && (
        <>
          <ComplianceAlerts receiptAlerts={receiptAlerts} cashAlerts={cashAlerts} />
          <GobTracker summary={gobSummary} upcoming={upcoming} />
          <ReimbursementPipeline initial={reimbursements} />
          <LedgerEntryForm recent={recentLedger} />
        </>
      )}

      <StatefulRecurringTasks groups={toolkit.recurringTasks} completedIds={completedIds} />

      <SopTeaser roleSlug={slug} recent={sopArticles} />

      <RoleReference
        overview={toolkit.overview}
        responsibilities={toolkit.responsibilities}
        handoffChecklist={toolkit.handoffChecklist}
        quickLinks={linksWithUrls}
        isAdmin={isAdmin}
      />
    </div>
  );
}
