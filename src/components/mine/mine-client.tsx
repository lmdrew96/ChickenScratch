'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { SubmissionForm } from '@/components/forms/submission-form';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { EDITABLE_STATUSES, formatStatus } from '@/lib/constants';
import type { Submission } from '@/types/database';
import { useToast } from '@/components/ui/toast';
import { getSignedDownloadUrl } from '@/lib/actions/storage';

type MineSubmission = Submission & {
  art_files: string[];
  assigned_editor_profile: { name: string | null; email: string | null } | null;
};

type MineClientProps = {
  submissions: MineSubmission[];
  viewerName: string;
  loadIssue?: boolean;
};

export function MineClient({ submissions, viewerName, loadIssue = false }: MineClientProps) {
  const { notify } = useToast();
  const [selectedId, setSelectedId] = useState(submissions[0]?.id ?? null);
  const router = useRouter();

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? submissions[0] ?? null,
    [selectedId, submissions]
  );

  if (!selectedSubmission) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        {loadIssue ? (
          <p>
            We had trouble loading your submissions. Refresh the page or try again later to see your latest work.
          </p>
        ) : (
          <p>No submissions yet. Once you share work it will appear here for tracking and revisions.</p>
        )}
      </div>
    );
  }

  const canEdit = EDITABLE_STATUSES.includes(selectedSubmission.status);

  async function downloadPath(path: string) {
    const { signedUrl, error } = await getSignedDownloadUrl(path);
    if (error || !signedUrl) {
      notify({ title: 'Download failed', description: error ?? 'Unable to generate link.', variant: 'error' });
      return;
    }
    window.open(signedUrl, '_blank');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white/80">{viewerName}</p>
        <ul className="space-y-2 text-sm">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <button
                type="button"
                onClick={() => setSelectedId(submission.id)}
                className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left transition ${
                  submission.id === selectedSubmission.id
                    ? 'border-amber-400/70 bg-amber-400/10 text-white'
                    : 'border-white/10 bg-white/0 text-white/70 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <span className="text-sm font-semibold">{submission.title}</span>
                <span className="text-xs uppercase tracking-wide text-white/50">
                  {formatStatus(submission.status)} • {new Date(submission.created_at ?? '').toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">{selectedSubmission.title}</h2>
            <StatusBadge status={selectedSubmission.status} />
          </div>
          <p className="text-sm text-white/70">{selectedSubmission.summary ?? 'No summary provided yet.'}</p>
        </header>

        <dl className="grid gap-3 text-sm text-white/70 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-white/80">Type</dt>
            <dd className="capitalize">{selectedSubmission.type}</dd>
          </div>
          <div>
            <dt className="font-medium text-white/80">Genre</dt>
            <dd>{selectedSubmission.genre || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-white/80">Content warnings</dt>
            <dd>{selectedSubmission.content_warnings || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-white/80">Assigned editor</dt>
            <dd>
              {selectedSubmission.assigned_editor_profile?.name || selectedSubmission.assigned_editor_profile?.email ||
                'Unassigned'}
            </dd>
          </div>
        </dl>

        {selectedSubmission.editor_notes ? (
          <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
            <p className="font-semibold uppercase tracking-wide">Editor notes</p>
            <p className="mt-1 whitespace-pre-wrap text-amber-50/90">{selectedSubmission.editor_notes}</p>
          </div>
        ) : null}

        {selectedSubmission.type === 'writing' ? (
          <article className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">Text body</p>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-white/80">{selectedSubmission.text_body ?? ''}</pre>
          </article>
        ) : (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-white/50">Attachments</p>
            <ul className="space-y-2">
              {selectedSubmission.art_files.map((path) => (
                <li key={path} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                  <span>{path.split('/').pop()}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => downloadPath(path)}>
                    Download
                  </Button>
                </li>
              ))}
              {selectedSubmission.art_files.length === 0 ? (
                <li className="text-xs text-white/50">No attachments.</li>
              ) : null}
            </ul>
          </div>
        )}

        {canEdit ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Update submission</h3>
            <SubmissionForm mode="edit" submission={selectedSubmission} onSuccess={() => router.refresh()} />
          </div>
        ) : (
          <p className="text-xs text-white/50">
            Editing is disabled for this piece because it has moved past the revision stage. Reach out to the editors if you
            need to make changes.
          </p>
        )}
      </section>
    </div>
  );
}
