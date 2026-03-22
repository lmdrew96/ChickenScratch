import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';

import { requireCommitteeRole } from '@/lib/auth/guards';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { importTextForProofread } from '@/lib/import-text-for-proofread';
import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';
import { ProofreadEditor } from '@/components/committee/proofread/proofread-editor';

export default async function ProofreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCommitteeRole('/committee');
  const { profile } = await requireUser('/committee');
  const userRole = await getCurrentUserRole();

  const positions = userRole?.positions ?? [];
  const isCoordinator = positions.includes('Submissions Coordinator');
  const isProofreader = positions.includes('Proofreader');
  const isOfficer = userRole?.roles?.includes('officer') ?? false;
  const isEiC = positions.includes('Editor-in-Chief');

  // Officers and EiC get edit access; coordinators are read-only; proofreaders edit
  const readOnly = isCoordinator && !isOfficer && !isEiC;

  const rows = await db()
    .select({
      id: submissions.id,
      title: submissions.title,
      type: submissions.type,
      proofread_html: submissions.proofread_html,
      google_docs_link: submissions.google_docs_link,
      committee_status: submissions.committee_status,
      proofreader_committed_at: submissions.proofreader_committed_at,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  const submission = rows[0];
  if (!submission) notFound();
  if (submission.type !== 'writing') redirect('/committee');

  // Import file content on first access if not yet imported
  let proofreadHtml = submission.proofread_html;
  if (!proofreadHtml) {
    const result = await importTextForProofread(id, profile.id);
    proofreadHtml = result.html;
  }

  const isCommitted = Boolean(submission.proofreader_committed_at);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/committee"
            className="text-sm text-white/50 hover:text-white/80"
          >
            ← Inbox
          </Link>
          {readOnly && (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-0.5 text-xs text-white/50">
              Read-only — coordinator view
            </span>
          )}
          {isCommitted && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-900/20 px-3 py-0.5 text-xs text-emerald-300">
              Committed
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-white">{submission.title}</h1>
        <p className="text-sm text-white/40 capitalize">
          {submission.committee_status?.replace(/_/g, ' ') ?? 'No status'}
        </p>
      </header>

      <ProofreadEditor
        submissionId={id}
        initialHtml={proofreadHtml}
        googleDocsLink={submission.google_docs_link}
        readOnly={readOnly || isCommitted}
      />
    </div>
  );
}
