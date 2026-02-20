'use client';

import { useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { StatusBadge } from '@/components/common/status-badge';
import { ContentViewer } from '@/components/mine/content-viewer';
import { EDITABLE_STATUSES, formatStatus } from '@/lib/constants';
import { reviseSubmission } from '@/lib/actions/submissions';
import type { Submission } from '@/types/database';
import { useToast } from '@/components/ui/toast';

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

  const canEdit = selectedSubmission.status ? EDITABLE_STATUSES.includes(selectedSubmission.status) : false;

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

        {/* Content viewer */}
        {selectedSubmission.type === 'writing' && selectedSubmission.file_url ? (
          <ContentViewer
            key={selectedSubmission.id}
            filePath={selectedSubmission.file_url}
            fileType={selectedSubmission.file_type}
            fileName={selectedSubmission.file_name}
            submissionType="writing"
          />
        ) : selectedSubmission.type === 'visual' && selectedSubmission.art_files.length > 0 ? (
          <div className="space-y-4">
            {selectedSubmission.art_files.map((path) => (
              <ContentViewer
                key={path}
                filePath={path}
                fileType={selectedSubmission.file_type}
                fileName={path.split('/').pop() || null}
                submissionType="visual"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
            <p className="text-xs text-white/50">No content uploaded.</p>
          </div>
        )}

        {/* Revision form — only when committee has requested changes */}
        {canEdit ? (
          <RevisionForm
            submission={selectedSubmission}
            onSuccess={() => {
              notify({ title: 'Revision submitted', description: 'Your changes have been sent for re-review.', variant: 'success' });
              router.refresh();
            }}
            onError={(msg) => {
              notify({ title: 'Revision failed', description: msg, variant: 'error' });
            }}
          />
        ) : null}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline revision form
// ---------------------------------------------------------------------------

function RevisionForm({
  submission,
  onSuccess,
  onError,
}: {
  submission: { id: string; title: string; preferred_name: string | null; type: string; file_name: string | null };
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState(submission.title);
  const [preferredName, setPreferredName] = useState(submission.preferred_name ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFormats = submission.type === 'writing'
    ? '.doc,.docx,.pdf,.txt'
    : '.jpg,.jpeg,.png,.gif,.webp,.pdf';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set('title', title.trim());
    formData.set('preferredName', preferredName.trim());

    const file = fileInputRef.current?.files?.[0];
    if (file) {
      formData.set('file', file);
    }

    const result = await reviseSubmission(submission.id, formData);

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      onError(result.error || 'Something went wrong.');
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-5">
      <h3 className="text-lg font-semibold text-white">Revise your submission</h3>
      <p className="text-sm text-white/60">
        The committee has requested changes. Update the fields below and re-submit.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="rev-title" className="text-sm font-medium text-white/80">
            Title
          </label>
          <input
            id="rev-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="rev-name" className="text-sm font-medium text-white/80">
            Preferred publishing name
          </label>
          <input
            id="rev-name"
            type="text"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            maxLength={200}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="rev-file" className="text-sm font-medium text-white/80">
            Replace file {submission.file_name ? <span className="font-normal text-white/50">(current: {submission.file_name})</span> : null}
          </label>
          <input
            id="rev-file"
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-1 file:text-sm file:font-medium file:text-white/80"
          />
          <p className="text-xs text-white/40">Leave empty to keep the current file.</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="btn btn-accent disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit revision'}
        </button>
      </form>
    </div>
  );
}
