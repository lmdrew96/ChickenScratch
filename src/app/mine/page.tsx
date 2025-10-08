import Link from 'next/link';

import { PageHeader } from '@/components/navigation';
import { EmptyState } from '@/components/ui';
import { requireUser } from '@/lib/auth/guards';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import type { Submission } from '@/types/database';

export default async function MinePage() {
  const { profile } = await requireUser('/mine');

  // Fetch user's submissions directly from Supabase
  const supabase = await createSupabaseServerReadOnlyClient();
  let submissions: Submission[] = [];
  
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching submissions:', error);
    } else if (data) {
      submissions = data;
    }
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
  }

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
      {submissions.length === 0 ? (
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
        <ul className="space-y-4">
          {submissions.map((submission) => {
            const title = submission.title?.trim() || 'Untitled submission';
            const status = formatStatus(submission.status);
            const updated = formatDate(submission.updated_at ?? submission.created_at);

            return (
              <li key={submission.id}>
                <article className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
                      <p className="text-sm text-slate-400">Updated {updated}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
                      {status}
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatStatus(status?: string | null) {
  if (!status) {
    return 'Submitted';
  }

  return status
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
