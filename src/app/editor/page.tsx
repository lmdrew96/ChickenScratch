import PageHeader from '@/components/shell/page-header';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import type { Submission } from '@/types/database';

export default async function EditorPage() {
  await requireRole(['editor', 'committee'], '/editor');

  // Fetch all submissions for editors
  const supabase = await createSupabaseServerReadOnlyClient();
  let unassignedSubmissions: Submission[] = [];
  let assignedSubmissions: Submission[] = [];
  
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching submissions:', error);
    } else if (data) {
      // Split submissions into unassigned and assigned
      unassignedSubmissions = data.filter(s => !s.assigned_editor);
      assignedSubmissions = data.filter(s => s.assigned_editor);
    }
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editor Dashboard" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--text)]">
              Unassigned submissions ({unassignedSubmissions.length})
            </h2>
            <p className="text-sm text-slate-300">Pieces that still need an editor.</p>
          </header>
          {unassignedSubmissions.length === 0 ? (
            <p className="text-sm text-slate-400">No unassigned submissions at this time.</p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-200">
              {unassignedSubmissions.map((submission) => (
                <li key={submission.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="font-semibold text-[var(--text)]">{submission.title}</p>
                  <p className="text-xs text-slate-300">
                    {submission.type} • {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--text)]">
              Assigned submissions ({assignedSubmissions.length})
            </h2>
            <p className="text-sm text-slate-300">Submissions currently being reviewed.</p>
          </header>
          {assignedSubmissions.length === 0 ? (
            <p className="text-sm text-slate-400">No assigned submissions at this time.</p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-200">
              {assignedSubmissions.map((submission) => (
                <li key={submission.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="font-semibold text-[var(--text)]">{submission.title}</p>
                  <p className="text-xs text-slate-300">
                    {submission.status} • {submission.updated_at ? new Date(submission.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
