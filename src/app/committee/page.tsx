import PageHeader from '@/components/shell/page-header';
import KanbanBoard from '@/components/committee/kanban-board';
import { requireCommitteeRole } from '@/lib/auth/guards';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import { Submission } from '@/types/database';

export default async function CommitteePage() {
  const { profile } = await requireCommitteeRole('/committee');
  
  // Fetch submissions relevant to this user's role
  const supabase = await createSupabaseServerReadOnlyClient();
  let submissionsData: Submission[] = [];
  
  try {
    // For now, fetch all submissions - in production this would be filtered by role
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching submissions:', error);
    } else {
      submissionsData = data || [];
    }
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
  }

  const roleDisplayNames = {
    editor_in_chief: 'Editor-in-Chief',
    submissions_coordinator: 'Submissions Coordinator',
    proofreader: 'Proofreader',
    lead_design: 'Lead Design'
  };

  const displayRole = roleDisplayNames[profile.role as keyof typeof roleDisplayNames] || profile.role;

  return (
    <div className="space-y-6">
      <PageHeader title="Committee Workflow" />
      
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Welcome, {displayRole}</h2>
          <p className="text-sm text-slate-300">
            Committee access granted - manage submissions workflow
          </p>
        </div>
      </div>

      <KanbanBoard userRole={profile.role} submissions={submissionsData} />
    </div>
  );
}
