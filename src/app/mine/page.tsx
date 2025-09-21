import { MineClient } from '@/components/mine/mine-client';
import { requireProfile } from '@/lib/auth';
import { logHandledIssue } from '@/lib/logging';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import type { Submission } from '@/types/database';

export default async function MinePage() {
  const { profile } = await requireProfile();
  const supabase = await createSupabaseServerReadOnlyClient();
  let rawSubmissions: MineSubmissionRow[] = [];
  let encounteredLoadIssue = false;

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*, assigned_editor_profile:profiles!submissions_assigned_editor_fkey(name,email)')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      encounteredLoadIssue = true;
      logHandledIssue('mine:query', {
        reason: 'Supabase query for personal submissions failed',
        context: {
          supabaseMessage: error.message,
          supabaseDetails: error.details,
          supabaseHint: error.hint,
          supabaseCode: error.code,
          ownerId: profile.id,
        },
      });
    } else {
      rawSubmissions = (data ?? []) as unknown as MineSubmissionRow[];
    }
  } catch (error) {
    encounteredLoadIssue = true;
    logHandledIssue('mine:unexpected', {
      reason: 'Unexpected failure while loading personal submissions',
      cause: error,
      context: { ownerId: profile.id },
    });
  }
  const submissions: MineSubmission[] = rawSubmissions.map((submission) => ({
    ...submission,
    art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">My submissions</h1>
        <p className="text-sm text-white/70">
          Track your pieces, upload revisions, and see editorial notes. You can edit while the status is Submitted or
          Needs Revision.
        </p>
      </header>
      <MineClient
        submissions={submissions}
        viewerName={profile.name ?? profile.email ?? 'student'}
        loadIssue={encounteredLoadIssue}
      />
    </div>
  );
}

type MineSubmission = Submission & {
  art_files: string[];
  assigned_editor_profile: { name: string | null; email: string | null } | null;
};

type MineSubmissionRow = Submission & {
  art_files: Submission['art_files'];
  assigned_editor_profile: { name: string | null; email: string | null } | null;
};
