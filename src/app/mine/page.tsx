import Link from 'next/link';
import { eq, desc, inArray } from 'drizzle-orm';

import { PageHeader } from '@/components/navigation';
import { EmptyState } from '@/components/ui';
import { MineClient } from '@/components/mine/mine-client';
import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { submissions, profiles } from '@/lib/db/schema';
import type { Submission } from '@/types/database';

export default async function MinePage() {
  const { profile } = await requireUser('/mine');

  let userSubmissions: Submission[] = [];
  let loadIssue = false;

  try {
    userSubmissions = await db()
      .select()
      .from(submissions)
      .where(eq(submissions.owner_id, profile.id))
      .orderBy(desc(submissions.created_at));
  } catch {
    loadIssue = true;
  }

  // Fetch editor profiles for submissions that have an assigned editor
  const editorIds = [
    ...new Set(
      userSubmissions
        .map((s) => s.assigned_editor)
        .filter((id): id is string => !!id),
    ),
  ];

  const editorMap = new Map<string, { name: string | null; email: string | null }>();

  if (editorIds.length > 0) {
    try {
      const editorRows = await db()
        .select({ id: profiles.id, name: profiles.name, email: profiles.email })
        .from(profiles)
        .where(inArray(profiles.id, editorIds));

      for (const row of editorRows) {
        editorMap.set(row.id, { name: row.name, email: row.email });
      }
    } catch {
      // Non-critical — editor names just won't display
    }
  }

  const enrichedSubmissions = userSubmissions.map((s) => ({
    ...s,
    art_files: (Array.isArray(s.art_files) ? s.art_files : []) as string[],
    assigned_editor_profile: s.assigned_editor
      ? editorMap.get(s.assigned_editor) ?? null
      : null,
  }));

  const viewerName = profile.full_name || profile.name || profile.email || 'Author';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Submissions"
        description="View and manage your submitted works"
        action={
          <Link href="/submit" className="btn btn-accent">
            Submit new
          </Link>
        }
      />
      {userSubmissions.length === 0 && !loadIssue ? (
        <EmptyState
          variant="submissions"
          title="No submissions yet"
          description="You haven't submitted any work yet. Start by creating your first submission to share your writing or visual art with the Chicken Scratch community."
          action={{
            label: "Create your first submission",
            href: "/submit"
          }}
          secondaryAction={{
            label: "View published works",
            href: "/published"
          }}
        />
      ) : (
        <MineClient
          submissions={enrichedSubmissions}
          viewerName={viewerName}
          loadIssue={loadIssue}
        />
      )}
    </div>
  );
}
