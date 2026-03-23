import { redirect } from 'next/navigation';
import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';

import PageHeader from '@/components/shell/page-header';
import { requireUser } from '@/lib/auth/guards';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { db } from '@/lib/db';
import { submissions, profiles, userRoles } from '@/lib/db/schema';
import { EditorDashboard } from '@/components/editor/editor-dashboard';
import type { EditorSubmission } from '@/components/editor/editor-dashboard';
import { ExportReportButton } from '@/components/editor/export-report-button';

function getDaysSince(date: Date | string | null): number {
  if (!date) return 0;
  const updated = date instanceof Date ? date : new Date(date);
  return Math.ceil(Math.abs(Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function EditorInChiefDashboard() {
  const { profile: viewerProfile } = await requireUser('/editor');
  const userRole = await getCurrentUserRole();
  const isEditorInChief = userRole?.positions?.includes('Editor-in-Chief');

  if (!isEditorInChief) {
    redirect(userRole?.roles?.includes('committee') ? '/committee' : '/mine');
  }

  const database = db();
  let allSubmissions: EditorSubmission[] = [];
  let loadIssue = false;

  try {
    const data = await database
      .select()
      .from(submissions)
      .orderBy(desc(submissions.created_at));

    if (data) {
      const profileIds = new Set<string>();
      data.forEach((s) => {
        profileIds.add(s.owner_id);
        if (s.assigned_editor) profileIds.add(s.assigned_editor);
      });

      const profileMap = new Map<string, { id: string; name: string | null; email: string | null }>();
      if (profileIds.size > 0) {
        const profileRows = await database
          .select({ id: profiles.id, name: profiles.name, email: profiles.email })
          .from(profiles)
          .where(inArray(profiles.id, [...profileIds]));
        profileRows.forEach((p) => profileMap.set(p.id, p));
      }

      allSubmissions = data.map((submission) => ({
        ...submission,
        art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
        owner: profileMap.get(submission.owner_id) ?? null,
        assigned_editor_profile: submission.assigned_editor
          ? profileMap.get(submission.assigned_editor) ?? null
          : null,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    loadIssue = true;
  }

  let editors: { id: string; name: string | null; email: string | null }[] = [];
  let rosterLoadIssue = false;

  try {
    const committeeMembers = await database
      .select({ user_id: userRoles.user_id })
      .from(userRoles)
      .where(eq(userRoles.is_member, true));

    const memberIds = committeeMembers.map((m) => m.user_id);
    if (memberIds.length > 0) {
      editors = await database
        .select({ id: profiles.id, name: profiles.name, email: profiles.email })
        .from(profiles)
        .where(inArray(profiles.id, memberIds));
    }
  } catch (error) {
    console.error('Failed to fetch editors:', error);
    rosterLoadIssue = true;
  }

  const viewerName = viewerProfile.name || viewerProfile.email || 'Editor';

  const metrics = {
    total: allSubmissions.length,
    awaitingYou: allSubmissions.filter((s) => s.committee_status === 'with_editor_in_chief').length,
    inWorkflow: allSubmissions.filter(
      (s) =>
        s.committee_status &&
        ['with_coordinator', 'with_proofreader'].includes(s.committee_status)
    ).length,
    published: allSubmissions.filter((s) => s.status === 'published').length,
  };

  const stuckCount = allSubmissions.filter(
    (s) => getDaysSince(s.updated_at) > 7 && s.status !== 'published'
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Editor-in-Chief" />
        <div className="flex items-center gap-3">
          <Link
            href="/committee"
            className="rounded-md border border-white/20 px-3 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Committee workflow
          </Link>
          <ExportReportButton />
        </div>
      </div>

      {stuckCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-900/20 px-4 py-3 text-sm">
          <span className="font-semibold text-amber-200">
            {stuckCount} submission{stuckCount !== 1 ? 's' : ''} stuck
          </span>
          <span className="text-amber-300/60">No movement in over 7 days</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total submissions', value: metrics.total, color: 'text-white' },
          { label: 'Awaiting you', value: metrics.awaitingYou, color: 'text-amber-400' },
          { label: 'In workflow', value: metrics.inWorkflow, color: 'text-blue-400' },
          { label: 'Published', value: metrics.published, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <EditorDashboard
        submissions={allSubmissions}
        editors={editors}
        viewerName={viewerName}
        loadIssue={loadIssue}
        rosterLoadIssue={rosterLoadIssue}
      />
    </div>
  );
}
