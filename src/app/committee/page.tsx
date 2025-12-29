import PageHeader from '@/components/shell/page-header';
import KanbanBoard from '@/components/committee/kanban-board';
import { requireCommitteeRole } from '@/lib/auth/guards';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { Submission } from '@/types/database';

export default async function CommitteePage() {
  const { profile } = await requireCommitteeRole('/committee');
  
  // Fetch user's actual positions from user_roles table
  const userRole = await getCurrentUserRole();
  
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

  // Determine display role and actual position for kanban board
  let displayRole = 'Committee Member';
  let userPosition: string = profile.role ?? 'student'; // Fallback to legacy role
  
  if (userRole && userRole.positions && userRole.positions.length > 0) {
    // Use the first committee position found
    const committeePositions = ['Editor-in-Chief', 'Submissions Coordinator', 'Proofreader', 'Lead Design'];
    const position = userRole.positions.find(p => committeePositions.includes(p));
    
    if (position) {
      displayRole = position;
      // Convert to lowercase snake_case for kanban board logic
      userPosition = position.toLowerCase().replace(/[- ]/g, '_');
    }
  } else {
    // Fallback to legacy role display
    const roleDisplayNames = {
      editor_in_chief: 'Editor-in-Chief',
      submissions_coordinator: 'Submissions Coordinator',
      proofreader: 'Proofreader',
      lead_design: 'Lead Design'
    };
    displayRole = roleDisplayNames[profile.role as keyof typeof roleDisplayNames] || profile.role || 'Committee Member';
  }

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

      <KanbanBoard userRole={userPosition} submissions={submissionsData} />
    </div>
  );
}
