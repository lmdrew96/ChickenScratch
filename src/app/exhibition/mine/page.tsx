import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { PageHeader } from '@/components/navigation';
import { requireMemberRole } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { exhibitionSubmissions } from '@/lib/db/schema';
import type { ExhibitionSubmission } from '@/types/database';

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-300',
  declined: 'bg-red-500/20 text-red-300',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-slate-500/20 text-slate-300';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function SubmissionCard({ s }: { s: ExhibitionSubmission }) {
  const submittedDate = s.created_at
    ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-white">{s.title}</p>
          {s.preferred_name && (
            <p className="text-xs text-slate-400">by {s.preferred_name}</p>
          )}
        </div>
        <StatusBadge status={s.status ?? 'submitted'} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="capitalize">{s.type}</span>
        {s.medium && <span className="capitalize">{s.medium.replace(/_/g, ' ')}</span>}
        {submittedDate && <span>Submitted {submittedDate}</span>}
      </div>

      {s.description && (
        <p className="text-sm text-slate-400 line-clamp-2">{s.description}</p>
      )}

      {s.file_url && (
        <p className="text-xs text-slate-400">
          File: {s.file_name ?? s.file_url}
          {s.file_size ? ` (${(s.file_size / 1024 / 1024).toFixed(2)} MB)` : ''}
        </p>
      )}

      {(s.status === 'approved' || s.status === 'declined') && s.reviewer_notes && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-medium text-slate-400 mb-1">Reviewer notes</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{s.reviewer_notes}</p>
        </div>
      )}

      {s.status === 'approved' && (
        <p className="text-sm text-green-400 font-medium">
          🎉 Your work has been selected for the exhibition!
        </p>
      )}
    </div>
  );
}

export default async function ExhibitionMinePage() {
  const { profile } = await requireMemberRole('/exhibition/mine');

  let submissions: ExhibitionSubmission[] = [];
  let loadError = false;

  try {
    submissions = await db()
      .select()
      .from(exhibitionSubmissions)
      .where(eq(exhibitionSubmissions.owner_id, profile.id))
      .orderBy(desc(exhibitionSubmissions.created_at));
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Exhibition Submissions"
        description="Track the status of your exhibition submissions"
        action={
          <Link href="/exhibition/submit" className="btn btn-accent">
            Submit another
          </Link>
        }
      />

      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load submissions. Please try refreshing the page.
        </div>
      )}

      {!loadError && submissions.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center space-y-4">
          <p className="text-slate-400">You haven&rsquo;t submitted anything yet.</p>
          <Link href="/exhibition/submit" className="btn btn-accent">
            Submit your work
          </Link>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="space-y-4">
          {submissions.map((s) => (
            <SubmissionCard key={s.id} s={s} />
          ))}
        </div>
      )}

      <Link href="/exhibition" className="text-sm text-slate-500 hover:text-slate-300">
        ← Back to exhibition info
      </Link>
    </div>
  );
}
