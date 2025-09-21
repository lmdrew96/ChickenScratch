import { EditorDashboard } from '@/components/editor/editor-dashboard';
import { requireEditorProfile } from '@/lib/auth';
import { logHandledIssue } from '@/lib/logging';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import type { Profile, Submission } from '@/types/database';

export default async function EditorPage() {
  const { profile } = await requireEditorProfile();
  const supabase = await createSupabaseServerReadOnlyClient();

  let rawSubmissions: EditorSubmissionRow[] = [];
  let submissionsLoadIssue = false;

  try {
    const { data: submissionsData, error: submissionsError } = await supabase
      .from('submissions')
      .select(
        '*,' +
          'owner:profiles!submissions_owner_id_fkey(id,name,email,role),' +
          'assigned_editor_profile:profiles!submissions_assigned_editor_fkey(id,name,email)'
      )
      .order('created_at', { ascending: false });

    if (submissionsError) {
      submissionsLoadIssue = true;
      logHandledIssue('editor:submissions:query', {
        reason: 'Supabase query for editorial submissions failed',
        context: {
          supabaseMessage: submissionsError.message,
          supabaseDetails: submissionsError.details,
          supabaseHint: submissionsError.hint,
          supabaseCode: submissionsError.code,
        },
      });
    } else {
      rawSubmissions = (submissionsData ?? []) as unknown as EditorSubmissionRow[];
    }
  } catch (error) {
    submissionsLoadIssue = true;
    logHandledIssue('editor:submissions:unexpected', {
      reason: 'Unexpected failure while loading submissions for editor dashboard',
      cause: error,
    });
  }

  const submissions: EditorSubmission[] = rawSubmissions.map((submission) => ({
    ...submission,
    art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
  }));

  let editors: Array<Pick<Profile, 'id' | 'name' | 'email' | 'role'>> = [];
  let editorsLoadIssue = false;

  try {
    const { data: editorsData, error: editorsError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .in('role', ['editor', 'admin'])
      .order('name');

    if (editorsError) {
      editorsLoadIssue = true;
      logHandledIssue('editor:roster:query', {
        reason: 'Supabase query for editor roster failed',
        context: {
          supabaseMessage: editorsError.message,
          supabaseDetails: editorsError.details,
          supabaseHint: editorsError.hint,
          supabaseCode: editorsError.code,
        },
      });
    } else {
      editors = (editorsData ?? []) as Array<Pick<Profile, 'id' | 'name' | 'email' | 'role'>>;
    }
  } catch (error) {
    editorsLoadIssue = true;
    logHandledIssue('editor:roster:unexpected', {
      reason: 'Unexpected failure while loading editor roster',
      cause: error,
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Editorial dashboard</h1>
        <p className="text-sm text-white/70">
          Review submissions, assign editors, and coordinate publication decisions. All updates are logged for auditing.
        </p>
      </header>
      {submissionsLoadIssue ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          The submission list may be incomplete because we couldn&apos;t reach Supabase. Refresh to retry.
        </p>
      ) : null}
      {editorsLoadIssue ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Editor assignments are read-only for now because the roster could not be loaded.
        </p>
      ) : null}
      <EditorDashboard
        submissions={submissions}
        editors={editors.map((editor) => ({
          id: editor.id,
          name: editor.name,
          email: editor.email,
          role: editor.role,
        }))}
        viewerName={profile.name ?? profile.email ?? 'editor'}
        loadIssue={submissionsLoadIssue}
        rosterLoadIssue={editorsLoadIssue}
      />
    </div>
  );
}

type EditorSubmission = Submission & {
  art_files: string[];
  owner: { id: string; name: string | null; email: string | null; role: string | null } | null;
  assigned_editor_profile: { id: string | null; name: string | null; email: string | null } | null;
};

type EditorSubmissionRow = Submission & {
  art_files: Submission['art_files'];
  owner: { id: string; name: string | null; email: string | null; role: string | null } | null;
  assigned_editor_profile: { id: string | null; name: string | null; email: string | null } | null;
};
