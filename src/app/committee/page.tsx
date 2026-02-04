import { desc } from 'drizzle-orm';

import PageHeader from '@/components/shell/page-header';
import KanbanBoard from '@/components/committee/kanban-board';
import { requireCommitteeRole } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';
import { getCurrentUserRole } from '@/lib/actions/roles';
import type { Submission } from '@/types/database';

export default async function CommitteePage() {
  const { profile } = await requireCommitteeRole('/committee');

  // Fetch user's actual positions from user_roles table
  const userRole = await getCurrentUserRole();

  let submissionsData: Submission[] = [];

  try {
    submissionsData = await db()
      .select()
      .from(submissions)
      .orderBy(desc(submissions.created_at));
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
