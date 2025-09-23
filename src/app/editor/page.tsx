export const revalidate = 0;
export const dynamic = 'force-dynamic';
import { EditorDashboard } from '@/components/editor/editor-dashboard';
import { requireEditorProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile, Submission } from '@/types/database';
import PageHeader from '@/components/shell/page-header';

export default async function EditorPage() {
  const { profile } = await requireEditorProfile();
  const supabase = await createSupabaseServerClient();

  const { data: submissionsData } = await supabase
    .from('submissions')
    .select(
      '*,' +
        'owner:profiles!submissions_owner_id_fkey(id,name,email,role),' +
        'assigned_editor_profile:profiles!submissions_assigned_editor_fkey(id,name,email)'
    )
    .order('created_at', { ascending: false });

  const rawSubmissions = (submissionsData ?? []) as unknown as EditorSubmissionRow[];
  const submissions: EditorSubmission[] = rawSubmissions.map((submission) => ({
    ...submission,
    art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
  }));

  const { data: editorsData } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .in('role', ['editor', 'admin'])
    .order('name');

  const editors = (editorsData ?? []) as Array<Pick<Profile, 'id' | 'name' | 'email' | 'role'>>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <PageHeader title="Editorial Dashboard" />
        <p className="text-sm text-white/70">
          Review submissions, assign editors, and coordinate publication decisions. All updates are logged for auditing.
        </p>
      </header>
      <EditorDashboard
        submissions={submissions}
        editors={editors.map((editor) => ({
          id: editor.id,
          name: editor.name,
          email: editor.email,
          role: editor.role,
        }))}
        viewerName={profile.name ?? profile.email ?? 'editor'}
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
