// EditorDashboard will be loaded dynamically below
import { requireEditorProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile, Submission } from '@/types/database';

export default async function EditorPage() {
  // Dynamically import the EditorDashboard component
  const mod = await import('@/components/editor/editor-dashboard').catch(() => null as any);
  const EditorDashboard = (mod?.default ?? (mod as any)?.EditorDashboard) as any;

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
    .in('role', ['editor', 'admin', 'committee', 'editor_in_chief', 'submissions_coordinator', 'proofreader', 'circulation_curator'])
    .order('name');

  const editors = (editorsData ?? []) as Array<Pick<Profile, 'id' | 'name' | 'email' | 'role'>>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Editorial dashboard</h1>
        <p className="text-sm text-white/70">
          Review submissions, assign editors, and coordinate publication decisions. All updates are logged for auditing.
        </p>
      </header>
      {EditorDashboard ? (
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
      ) : (
        <div className="rounded-md border border-rose-700/50 bg-rose-900/30 p-4 text-rose-200">
          Editor dashboard component not found. Ensure it is exported as either default or
          `export const EditorDashboard` from one of:
          <ul className="list-disc pl-6">
            <li><code>src/components/editor/editor-dashboard.tsx</code></li>
            <li><code>src/components/editor/EditorDashboard.tsx</code></li>
          </ul>
        </div>
      )}
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
