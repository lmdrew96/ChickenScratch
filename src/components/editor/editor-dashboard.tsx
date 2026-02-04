'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/shared/loading-states';
import { useConfirmation } from '@/hooks/use-confirmation';
import { EDITABLE_STATUSES, SUBMISSION_STATUSES, formatStatus } from '@/lib/constants';
import { getSignedDownloadUrl } from '@/lib/actions/storage';
import type { Submission } from '@/types/database';

export type EditorSubmission = Submission & {
  art_files: string[];
  owner: { id: string; name: string | null; email: string | null; role: string | null } | null;
  assigned_editor_profile: { id: string | null; name: string | null; email: string | null } | null;
};

type EditorDashboardProps = {
  submissions: EditorSubmission[];
  editors: { id: string; name: string | null; email: string | null; role: string | null }[];
  viewerName: string;
  loadIssue?: boolean;
  rosterLoadIssue?: boolean;
};

type LoadingState = {
  assignment: boolean;
  notes: boolean;
  status: boolean;
  publish: boolean;
};

export function EditorDashboard({
  submissions,
  editors,
  viewerName,
  loadIssue = false,
  rosterLoadIssue = false,
}: EditorDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | Submission['status']>('all');
  const [selectedId, setSelectedId] = useState(submissions[0]?.id ?? null);
  const { notify } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const confirmation = useConfirmation();

  // Separate loading states for each action
  const [loadingState, setLoadingState] = useState<LoadingState>({
    assignment: false,
    notes: false,
    status: false,
    publish: false,
  });

  // Optimistic state for UI updates
  const [optimisticSubmissions, setOptimisticSubmissions] = useState<EditorSubmission[]>(submissions);

  // Update optimistic state when props change
  useEffect(() => {
    setOptimisticSubmissions(submissions);
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return optimisticSubmissions.filter((submission) => statusFilter === 'all' || submission.status === statusFilter);
  }, [optimisticSubmissions, statusFilter]);

  const selectedSubmission = useMemo(
    () => optimisticSubmissions.find((submission) => submission.id === selectedId) ?? filteredSubmissions[0] ?? null,
    [filteredSubmissions, selectedId, optimisticSubmissions]
  );

  useEffect(() => {
    if (filteredSubmissions.length > 0 && !filteredSubmissions.some((submission) => submission.id === selectedId)) {
      setSelectedId(filteredSubmissions[0].id);
    }
  }, [filteredSubmissions, selectedId]);

  const [notesDraft, setNotesDraft] = useState(selectedSubmission?.editor_notes ?? '');
  const [assignedEditor, setAssignedEditor] = useState(selectedSubmission?.assigned_editor_profile?.id ?? '');
  const [publishUrl, setPublishUrl] = useState(selectedSubmission?.published_url ?? '');
  const [publishIssue, setPublishIssue] = useState(selectedSubmission?.issue ?? '');
  const [published, setPublished] = useState(!!selectedSubmission?.published);

  const canStudentEdit = selectedSubmission?.status ? EDITABLE_STATUSES.includes(selectedSubmission.status) : false;

  const filters = ['all', ...SUBMISSION_STATUSES] as const;

  useEffect(() => {
    if (!selectedSubmission) {
      return;
    }
    setNotesDraft(selectedSubmission.editor_notes ?? '');
    setAssignedEditor(selectedSubmission.assigned_editor_profile?.id ?? '');
    setPublishUrl(selectedSubmission.published_url ?? '');
    setPublishIssue(selectedSubmission.issue ?? '');
    setPublished(!!selectedSubmission.published);
  }, [selectedSubmission]);

  if (!selectedSubmission) {
    if (loadIssue) {
      return (
        <EmptyState
          variant="error"
          title="Unable to load submissions"
          description="We couldn't load the submission list. This might be a temporary issue. Please try refreshing the page or check back later for updates."
          action={{
            label: "Refresh page",
            onClick: () => window.location.reload()
          }}
        />
      );
    }

    return (
      <EmptyState
        variant="editor"
        title="No submissions to review"
        description="There are no submissions available for review at this time. Once students begin submitting their work, items will appear here for you to review and manage."
        secondaryAction={{
          label: "View published works",
          href: "/published"
        }}
      />
    );
  }

  async function mutate(
    endpoint: string,
    options: RequestInit,
    successMessage: string,
    loadingKey: keyof LoadingState
  ): Promise<boolean> {
    setLoadingState((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      const response = await fetch(endpoint, options);
      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const errorMessage = result.error ?? `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }
      
      notify({ title: 'Success', description: successMessage, variant: 'success' });
      
      // Use startTransition for router refresh to avoid blocking UI
      startTransition(() => {
        router.refresh();
      });
      
      return true;
    } catch (error) {
      notify({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'error',
      });
      return false;
    } finally {
      setLoadingState((prev) => ({ ...prev, [loadingKey]: false }));
    }
  }

  async function handleAssign(editorId: string | null) {
    if (!selectedSubmission || rosterLoadIssue) return;

    // Validation
    if (editorId && !editors.some((e) => e.id === editorId)) {
      notify({
        title: 'Invalid editor',
        description: 'Please select a valid editor from the list.',
        variant: 'error',
      });
      return;
    }

    // Optimistic update
    const assignedEditorProfile = editorId 
      ? editors.find((e) => e.id === editorId) ?? null
      : null;

    setOptimisticSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubmission.id
          ? { ...sub, assigned_editor_profile: assignedEditorProfile }
          : sub
      )
    );

    const success = await mutate(
      `/api/submissions/${selectedSubmission.id}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editorId }),
      },
      editorId ? 'Editor assigned successfully.' : 'Editor unassigned successfully.',
      'assignment'
    );

    // Revert optimistic update on failure
    if (!success) {
      setOptimisticSubmissions(submissions);
    }
  }

  async function handleStatusChange(status: Submission['status'], notes?: string) {
    if (!selectedSubmission) return;

    const payloadNotes = notes ?? notesDraft;

    // Validation
    if (status === 'needs_revision' && !payloadNotes.trim()) {
      notify({
        title: 'Notes required',
        description: 'Please add editor notes before requesting revisions.',
        variant: 'error',
      });
      return;
    }

    // Confirmation for destructive actions
    if (status === 'declined') {
      confirmation.confirm({
        title: 'Decline Submission',
        message: 'Are you sure you want to decline this submission? The author will be notified via email.',
        confirmText: 'Decline',
        cancelText: 'Cancel',
        variant: 'danger',
        onConfirm: async () => {
          await performStatusChange(status, payloadNotes);
        }
      });
      return;
    }

    await performStatusChange(status, payloadNotes);
  }

  async function performStatusChange(status: Submission['status'], payloadNotes: string) {
    if (!selectedSubmission) return;

    // Optimistic update
    setOptimisticSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubmission.id
          ? { 
              ...sub, 
              status, 
              editor_notes: payloadNotes,
              decision_date: status && ['accepted', 'declined', 'needs_revision'].includes(status)
                ? new Date()
                : sub.decision_date
            }
          : sub
      )
    );

    const success = await mutate(
      `/api/submissions/${selectedSubmission.id}/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, editorNotes: payloadNotes }),
      },
      `Status updated to ${formatStatus(status)} successfully.`,
      'status'
    );

    // Revert optimistic update on failure
    if (!success) {
      setOptimisticSubmissions(submissions);
    }
  }

  async function handleNotesSave() {
    if (!selectedSubmission) return;

    // Validation
    if (notesDraft.length > 4000) {
      notify({
        title: 'Notes too long',
        description: 'Editor notes must be 4000 characters or less.',
        variant: 'error',
      });
      return;
    }

    // Optimistic update
    setOptimisticSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubmission.id
          ? { ...sub, editor_notes: notesDraft }
          : sub
      )
    );

    const success = await mutate(
      `/api/submissions/${selectedSubmission.id}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editorNotes: notesDraft }),
      },
      'Notes updated successfully.',
      'notes'
    );

    // Revert optimistic update on failure
    if (!success) {
      setOptimisticSubmissions(submissions);
    }
  }

  async function handlePublishToggle() {
    if (!selectedSubmission) return;

    // Validation
    if (published && publishUrl && !isValidUrl(publishUrl)) {
      notify({
        title: 'Invalid URL',
        description: 'Please enter a valid URL for the published work.',
        variant: 'error',
      });
      return;
    }

    if (publishIssue && publishIssue.length > 120) {
      notify({
        title: 'Issue name too long',
        description: 'Issue name must be 120 characters or less.',
        variant: 'error',
      });
      return;
    }

    // Optimistic update
    setOptimisticSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubmission.id
          ? {
              ...sub,
              published,
              published_url: publishUrl || null,
              issue: publishIssue || null,
              status: published ? 'published' : sub.status,
            }
          : sub
      )
    );

    const success = await mutate(
      `/api/submissions/${selectedSubmission.id}/publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published,
          publishedUrl: publishUrl || null,
          issue: publishIssue || null,
        }),
      },
      published ? 'Marked as published successfully.' : 'Publication status removed successfully.',
      'publish'
    );

    // Revert optimistic update on failure
    if (!success) {
      setOptimisticSubmissions(submissions);
    }
  }

  async function downloadPath(path: string) {
    try {
      const { signedUrl, error } = await getSignedDownloadUrl(path);
      if (error || !signedUrl) {
        throw new Error(error ?? 'Unable to generate download link.');
      }
      window.open(signedUrl, '_blank');
    } catch (error) {
      notify({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unable to download file.',
        variant: 'error',
      });
    }
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  const assignmentsDisabled = rosterLoadIssue || editors.length === 0;
  const isAnyLoading = Object.values(loadingState).some((loading) => loading) || isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Signed in as</p>
          <p className="text-sm font-semibold text-white">{viewerName}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                statusFilter === filter
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'All' : formatStatus(filter)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Owner</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Updated</th>
              <th className="px-4 py-3 text-left font-semibold">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredSubmissions.map((submission) => (
              <tr
                key={submission.id}
                className={`cursor-pointer transition hover:bg-white/5 ${
                  submission.id === selectedSubmission.id ? 'bg-amber-400/10' : ''
                }`}
                onClick={() => setSelectedId(submission.id)}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{submission.title}</p>
                  <p className="text-xs text-white/50">{submission.summary?.slice(0, 80) ?? 'No summary'}</p>
                </td>
                <td className="px-4 py-3 text-white/70">
                  {submission.owner?.name || submission.owner?.email || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-white/70 capitalize">{submission.type}</td>
                <td className="px-4 py-3 text-white/70">
                  <StatusBadge status={submission.status} />
                </td>
                <td className="px-4 py-3 text-white/70">
                  {submission.updated_at ? new Date(submission.updated_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {submission.assigned_editor_profile?.name || submission.assigned_editor_profile?.email || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">{selectedSubmission.title}</h2>
            <StatusBadge status={selectedSubmission.status} />
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
              {selectedSubmission.owner?.email}
            </span>
          </div>
          <p className="text-sm text-white/70">{selectedSubmission.summary ?? 'No summary provided.'}</p>
        </header>

        <dl className="grid gap-3 text-sm text-white/70 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-white/80">Content warnings</dt>
            <dd>{selectedSubmission.content_warnings || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-white/80">Genre</dt>
            <dd>{selectedSubmission.genre || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-white/80">Assigned editor</dt>
            <dd>{selectedSubmission.assigned_editor_profile?.name || selectedSubmission.assigned_editor_profile?.email || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-white/80">Student editing</dt>
            <dd>{canStudentEdit ? 'Allowed' : 'Locked'}</dd>
          </div>
        </dl>

        {selectedSubmission.type === 'writing' ? (
          <article className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">Manuscript</p>
            <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm text-white/80">
              {selectedSubmission.text_body ?? ''}
            </pre>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Assign editor</Label>
              <Select
                value={assignedEditor ?? ''}
                onChange={(event) => setAssignedEditor(event.target.value)}
                disabled={assignmentsDisabled || isAnyLoading}
              >
                <option value="">Unassigned</option>
                {editors.map((editor) => (
                  <option key={editor.id} value={editor.id ?? ''}>
                    {editor.name || editor.email}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAssign(assignedEditor || null)}
                disabled={assignmentsDisabled || loadingState.assignment || isAnyLoading}
              >
                {loadingState.assignment ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  'Save assignment'
                )}
              </Button>
              {assignmentsDisabled ? (
                <p className="text-xs text-white/50">
                  Editor assignments are temporarily disabled because the roster could not be loaded.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>
                Editor notes
                <span className="ml-2 text-xs text-white/50">
                  ({notesDraft.length}/4000 characters)
                </span>
              </Label>
              <Textarea 
                value={notesDraft} 
                onChange={(event) => setNotesDraft(event.target.value)} 
                rows={6}
                maxLength={4000}
                disabled={isAnyLoading}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleNotesSave} 
                disabled={loadingState.notes || isAnyLoading}
              >
                {loadingState.notes ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  'Save notes'
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Publish options</Label>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <input
                  id="published-toggle"
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  disabled={isAnyLoading}
                />
                <Label htmlFor="published-toggle" className="text-sm text-white/80">
                  Published
                </Label>
              </div>
              <Input
                placeholder="Published URL"
                value={publishUrl}
                onChange={(event) => setPublishUrl(event.target.value)}
                disabled={isAnyLoading}
              />
              <Input 
                placeholder="Issue (Spring 2025)" 
                value={publishIssue} 
                onChange={(event) => setPublishIssue(event.target.value)}
                maxLength={120}
                disabled={isAnyLoading}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePublishToggle} 
                disabled={loadingState.publish || isAnyLoading}
              >
                {loadingState.publish ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  'Save publish settings'
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Set status</Label>
              <div className="flex flex-wrap gap-2">
                {['in_review', 'needs_revision', 'accepted', 'declined'].map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant="outline"
                    onClick={() => handleStatusChange(status as Submission['status'])}
                    disabled={loadingState.status || isAnyLoading}
                  >
                    {formatStatus(status as Submission['status'])}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-white/50">
                Needs Revision will email the student with the latest notes. Accepted or Declined will also send a summary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Dialog */}
      {confirmation.options && (
        <ConfirmModal
          isOpen={confirmation.isOpen}
          onClose={confirmation.handleCancel}
          onConfirm={confirmation.handleConfirm}
          title={confirmation.options.title}
          message={confirmation.options.message}
          confirmText={confirmation.options.confirmText}
          cancelText={confirmation.options.cancelText}
          variant={confirmation.options.variant}
        />
      )}
    </div>
  );
}
