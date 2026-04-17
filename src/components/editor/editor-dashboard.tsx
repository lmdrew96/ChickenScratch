'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

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
import { toEasternDateString } from '@/lib/utils';
import { getSignedDownloadUrl } from '@/lib/actions/storage';
import type { Submission } from '@/types/database';
import { parseImageTransform } from '@/types/image-transform';
import { ImageEditor } from '@/components/committee/visual/image-editor';

export type EditorSubmission = Submission & {
  art_files: string[];
  owner: { id: string; name: string | null; email: string | null } | null;
  assigned_editor_profile: { id: string | null; name: string | null; email: string | null } | null;
  daysSinceUpdate?: number;
};

type EditorDashboardProps = {
  submissions: EditorSubmission[];
  editors: { id: string; name: string | null; email: string | null }[];
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

type ActiveTab = 'details' | 'content' | 'publish';

function formatCommitteeStatus(status: string | null | undefined): string {
  if (!status) return 'New';
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function EditorDashboard({
  submissions,
  editors,
  loadIssue = false,
  rosterLoadIssue = false,
}: EditorDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | Submission['status']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'written' | 'visual'>('all');
  const [sortBy, setSortBy] = useState<'urgent' | 'newest' | 'oldest' | 'alpha' | 'stale'>('urgent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [searchQuery, setSearchQuery] = useState('');
  const [needsYouOnly, setNeedsYouOnly] = useState(false);
  const { notify } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const confirmation = useConfirmation();

  const [loadingState, setLoadingState] = useState<LoadingState>({
    assignment: false,
    notes: false,
    status: false,
    publish: false,
  });

  const [optimisticSubmissions, setOptimisticSubmissions] = useState<EditorSubmission[]>(submissions);

  useEffect(() => {
    setOptimisticSubmissions(submissions);
  }, [submissions]);

  const needsYouCount = useMemo(
    () => optimisticSubmissions.filter((s) => s.committee_status === 'with_editor_in_chief').length,
    [optimisticSubmissions]
  );

  const filteredSubmissions = useMemo(() => {
    let list = optimisticSubmissions.filter(
      (s) => statusFilter === 'all' || s.status === statusFilter
    );
    if (typeFilter !== 'all') list = list.filter((s) => s.type === typeFilter);
    if (needsYouOnly) list = list.filter((s) => s.committee_status === 'with_editor_in_chief');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.owner?.name ?? '').toLowerCase().includes(q) ||
          (s.owner?.email ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
        case 'oldest':
          return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
        case 'alpha':
          return a.title.localeCompare(b.title);
        case 'stale':
          return new Date(a.updated_at ?? 0).getTime() - new Date(b.updated_at ?? 0).getTime();
        default: { // urgent
          const aUrgent =
            a.committee_status === 'with_editor_in_chief' || (a.daysSinceUpdate ?? 0) > 7 ? 1 : 0;
          const bUrgent =
            b.committee_status === 'with_editor_in_chief' || (b.daysSinceUpdate ?? 0) > 7 ? 1 : 0;
          return bUrgent - aUrgent;
        }
      }
    });
  }, [optimisticSubmissions, statusFilter, typeFilter, sortBy, needsYouOnly, searchQuery]);

  // Collapse if the selected item is filtered out
  useEffect(() => {
    if (selectedId && !filteredSubmissions.some((s) => s.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredSubmissions, selectedId]);

  const selectedSubmission = useMemo(
    () => (selectedId ? (optimisticSubmissions.find((s) => s.id === selectedId) ?? null) : null),
    [selectedId, optimisticSubmissions]
  );

  const [notesDraft, setNotesDraft] = useState('');
  const [assignedEditor, setAssignedEditor] = useState('');
  const [volume, setVolume] = useState<number | ''>('');
  const [issueNumber, setIssueNumber] = useState<number | ''>('');
  const [publishDate, setPublishDate] = useState(toEasternDateString());
  const [publishedText, setPublishedText] = useState('');
  const [artSignedUrls, setArtSignedUrls] = useState<string[]>([]);
  const [originalArtUrl, setOriginalArtUrl] = useState<string | null>(null);

  const isAnyLoading = Object.values(loadingState).some(Boolean) || isPending;
  const assignmentsDisabled = rosterLoadIssue || editors.length === 0;
  const artTransform =
    selectedSubmission?.type === 'visual'
      ? parseImageTransform(selectedSubmission.image_transform)
      : null;
  const canStudentEdit = selectedSubmission?.status
    ? EDITABLE_STATUSES.includes(selectedSubmission.status)
    : false;
  const isAwaitingEiC = selectedSubmission?.committee_status === 'with_editor_in_chief';

  useEffect(() => {
    if (!selectedSubmission) return;
    setActiveTab('details');
    setNotesDraft(selectedSubmission.editor_notes ?? '');
    setAssignedEditor(selectedSubmission.assigned_editor_profile?.id ?? '');
    setVolume(selectedSubmission.volume ?? '');
    setIssueNumber(selectedSubmission.issue_number ?? '');
    setPublishDate(
      selectedSubmission.publish_date
        ? toEasternDateString(selectedSubmission.publish_date)
        : toEasternDateString()
    );
    setPublishedText('');
    setArtSignedUrls([]);
    setOriginalArtUrl(null);
    if (selectedSubmission.type === 'visual' && selectedSubmission.art_files.length > 0) {
      const t = parseImageTransform(selectedSubmission.image_transform);
      if (t?.processedPath) {
        void getSignedDownloadUrl(t.processedPath).then((r) => {
          setArtSignedUrls([r.signedUrl ?? '']);
        });
        void getSignedDownloadUrl(selectedSubmission.art_files[0]!).then((r) => {
          setOriginalArtUrl(r.signedUrl);
        });
      } else {
        void Promise.all(
          selectedSubmission.art_files.map((p) => getSignedDownloadUrl(p))
        ).then((results) => setArtSignedUrls(results.map((r) => r.signedUrl ?? '')));
      }
    }
  }, [selectedSubmission]);

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
        throw new Error(result.error ?? `Request failed with status ${response.status}`);
      }
      notify({ title: 'Success', description: successMessage, variant: 'success' });
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
    if (editorId && !editors.some((e) => e.id === editorId)) {
      notify({
        title: 'Invalid editor',
        description: 'Please select a valid editor from the list.',
        variant: 'error',
      });
      return;
    }
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
    if (!success) setOptimisticSubmissions(submissions);
  }

  async function handleStatusChange(status: Submission['status'], notes?: string) {
    if (!selectedSubmission) return;
    const payloadNotes = notes ?? notesDraft;
    if (status === 'needs_revision' && !payloadNotes.trim()) {
      notify({
        title: 'Notes required',
        description: 'Please add editor notes before requesting revisions.',
        variant: 'error',
      });
      return;
    }
    if (status === 'declined') {
      confirmation.confirm({
        title: 'Decline Submission',
        message:
          'Are you sure you want to decline this submission? The author will be notified via email.',
        confirmText: 'Decline',
        cancelText: 'Cancel',
        variant: 'danger',
        onConfirm: async () => {
          await performStatusChange(status, payloadNotes);
        },
      });
      return;
    }
    await performStatusChange(status, payloadNotes);
  }

  async function performStatusChange(status: Submission['status'], payloadNotes: string) {
    if (!selectedSubmission) return;
    setOptimisticSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubmission.id
          ? {
              ...sub,
              status,
              editor_notes: payloadNotes,
              decision_date:
                status && ['accepted', 'declined', 'needs_revision'].includes(status)
                  ? new Date()
                  : sub.decision_date,
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
    if (!success) setOptimisticSubmissions(submissions);
  }

  async function handleNotesSave() {
    if (!selectedSubmission) return;
    if (notesDraft.length > 4000) {
      notify({
        title: 'Notes too long',
        description: 'Editor notes must be 4000 characters or less.',
        variant: 'error',
      });
      return;
    }
    setOptimisticSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubmission.id ? { ...sub, editor_notes: notesDraft } : sub
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
    if (!success) setOptimisticSubmissions(submissions);
  }

  async function handlePublish() {
    if (!selectedSubmission || !volume || !issueNumber || !publishDate) return;
    if (typeof volume !== 'number' || volume < 1) {
      notify({
        title: 'Invalid volume',
        description: 'Volume must be a positive number.',
        variant: 'error',
      });
      return;
    }
    if (typeof issueNumber !== 'number' || issueNumber < 1) {
      notify({
        title: 'Invalid issue',
        description: 'Issue must be a positive number.',
        variant: 'error',
      });
      return;
    }
    setOptimisticSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === selectedSubmission.id
          ? {
              ...sub,
              published: true,
              volume,
              issue_number: issueNumber,
              publish_date: new Date(publishDate),
              issue: `Vol. ${volume}, No. ${issueNumber}`,
              status: 'published' as const,
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
          volume,
          issueNumber,
          publishDate: new Date(publishDate).toISOString(),
          publishedText: publishedText.trim() || undefined,
        }),
      },
      'Published successfully.',
      'publish'
    );
    if (!success) setOptimisticSubmissions(submissions);
  }

  async function downloadPath(path: string) {
    try {
      const { signedUrl, error } = await getSignedDownloadUrl(path);
      if (error || !signedUrl) throw new Error(error ?? 'Unable to generate download link.');
      window.open(signedUrl, '_blank');
    } catch (error) {
      notify({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unable to download file.',
        variant: 'error',
      });
    }
  }

  // Empty states (no submissions at all)
  if (optimisticSubmissions.length === 0) {
    if (loadIssue) {
      return (
        <EmptyState
          variant="error"
          title="Unable to load submissions"
          description="We couldn't load the submission list. This might be a temporary issue. Please try refreshing the page or check back later for updates."
          action={{ label: 'Refresh page', onClick: () => window.location.reload() }}
        />
      );
    }
    return (
      <EmptyState
        variant="editor"
        title="No submissions to review"
        description="There are no submissions available for review at this time. Once students begin submitting their work, items will appear here for you to review and manage."
        secondaryAction={{ label: 'View published works', href: '/published' }}
      />
    );
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 overflow-hidden">

        {/* ── Controls header ── */}
        <div className="border-b border-white/10 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Submissions
            </span>
            <span className="text-xs text-white/30">{filteredSubmissions.length}</span>
          </div>
          <Input
            type="search"
            placeholder="Search title or author…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={statusFilter ?? 'all'}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All statuses</option>
            {SUBMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </Select>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          >
            <option value="all">All types</option>
            <option value="written">Written</option>
            <option value="visual">Visual</option>
          </Select>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="urgent">Sort: Urgent first</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="alpha">Sort: A–Z</option>
            <option value="stale">Sort: Most stale</option>
          </Select>
          {needsYouCount > 0 && (
            <button
              type="button"
              onClick={() => setNeedsYouOnly((v) => !v)}
              className={`w-full rounded-md px-3 py-1.5 text-xs font-medium transition text-left ${
                needsYouOnly
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70'
              }`}
            >
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                  needsYouOnly ? 'bg-amber-400' : 'bg-white/30'
                }`}
              />
              Needs you · {needsYouCount}
            </button>
          )}
        </div>

        {/* ── Accordion list ── */}
        {filteredSubmissions.length === 0 ? (
          <p className="p-4 text-sm text-white/30">No submissions match this filter.</p>
        ) : (
          filteredSubmissions.map((sub) => {
            const isExpanded = sub.id === selectedId;
            const isStale = (sub.daysSinceUpdate ?? 0) > 7 && sub.status !== 'published';

            return (
              <div key={sub.id} className="border-b border-white/5 last:border-0">

                {/* Accordion trigger */}
                <button
                  type="button"
                  onClick={() => setSelectedId(isExpanded ? null : sub.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-white/5 flex items-start gap-3 border-l-2 ${
                    isExpanded
                      ? 'border-l-amber-400 bg-amber-400/10'
                      : 'border-l-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium leading-snug text-white">
                      {sub.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/40">
                      {sub.owner?.name || sub.owner?.email || 'Unknown'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={sub.status} className="px-2 py-0.5 text-[10px]" />
                      <span className="text-xs capitalize text-white/30">{sub.type}</span>
                      {sub.committee_status === 'with_editor_in_chief' && (
                        <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          needs you
                        </span>
                      )}
                    </div>
                    {isStale && (
                      <p className="mt-1 text-[10px] text-white/25">
                        {sub.daysSinceUpdate}d no movement
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 text-white/30 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Expanded detail */}
                {isExpanded && selectedSubmission && (
                  <div className="border-t border-white/10">

                    {/* Context strip (summary, committee status, email) */}
                    {(selectedSubmission.summary ||
                      selectedSubmission.committee_status ||
                      selectedSubmission.owner?.email) && (
                      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10 space-y-1.5">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs capitalize text-white/50">
                            {selectedSubmission.type}
                          </span>
                          {selectedSubmission.committee_status && (
                            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/40">
                              {formatCommitteeStatus(selectedSubmission.committee_status)}
                            </span>
                          )}
                        </div>
                        {selectedSubmission.owner?.email && (
                          <p className="text-xs text-white/30">
                            {selectedSubmission.owner.name
                              ? `${selectedSubmission.owner.name} · ${selectedSubmission.owner.email}`
                              : selectedSubmission.owner.email}
                          </p>
                        )}
                        {selectedSubmission.summary && (
                          <p className="text-sm text-white/60">{selectedSubmission.summary}</p>
                        )}
                      </div>
                    )}

                    {/* Sticky: Zone B (actions) + Zone C (tabs) */}
                    <div className="sticky top-0 z-10 bg-[#0b1220] border-b border-white/10">
                      {/* Zone B: Status actions */}
                      <div className="px-4 py-3 space-y-2 border-b border-white/10">
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('in_review')}
                            disabled={loadingState.status || isAnyLoading}
                          >
                            In Review
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusChange('needs_revision')}
                            disabled={loadingState.status || isAnyLoading}
                            className="border border-amber-500/40 bg-transparent text-white hover:bg-amber-900/20"
                          >
                            Needs Revision
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusChange('accepted')}
                            disabled={loadingState.status || isAnyLoading}
                            className="border border-emerald-500/40 bg-transparent text-white hover:bg-emerald-900/20"
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStatusChange('declined')}
                            disabled={loadingState.status || isAnyLoading}
                            className="border border-rose-500/40 bg-transparent text-white hover:bg-rose-900/20"
                          >
                            Decline
                          </Button>
                          {loadingState.status && <LoadingSpinner size="sm" />}
                        </div>
                        <p className="text-xs text-white/30">
                          Needs Revision emails the student with your notes. Accept or Decline sends
                          a decision summary.
                        </p>
                      </div>

                      {/* Zone C: Tabs */}
                      <div className="flex overflow-x-auto px-4">
                        {(
                          [
                            { id: 'details', label: 'Details' },
                            { id: 'content', label: 'Content' },
                            { id: 'publish', label: 'Publish', dot: isAwaitingEiC },
                          ] as { id: ActiveTab; label: string; dot?: boolean }[]
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                              activeTab === tab.id
                                ? 'border-amber-400 text-amber-400'
                                : 'border-transparent text-white/40 hover:text-white/70'
                            }`}
                          >
                            {tab.label}
                            {tab.dot && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Zone D: Tab content */}
                    <div className="p-4 space-y-5">

                      {/* ── DETAILS TAB ── */}
                      {activeTab === 'details' && (
                        <>
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                              <dt className="text-xs text-white/40">Content warnings</dt>
                              <dd className="mt-0.5 text-white/80">
                                {selectedSubmission.content_warnings || '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-white/40">Genre</dt>
                              <dd className="mt-0.5 text-white/80">
                                {selectedSubmission.genre || '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-white/40">Assigned editor</dt>
                              <dd className="mt-0.5 text-white/80">
                                {selectedSubmission.assigned_editor_profile?.name ||
                                  selectedSubmission.assigned_editor_profile?.email ||
                                  '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-white/40">Student editing</dt>
                              <dd className="mt-0.5 text-white/80">
                                {canStudentEdit ? 'Allowed' : 'Locked'}
                              </dd>
                            </div>
                          </dl>

                          {selectedSubmission.google_docs_link && (
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={selectedSubmission.google_docs_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                              >
                                Open Google Doc
                                <span className="text-white/30" aria-hidden>
                                  ↗
                                </span>
                              </a>
                              <span className="text-xs text-white/30">Proofread version</span>
                            </div>
                          )}

                          <div className="grid gap-4 sm:grid-cols-2">
                            <section className="space-y-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
                                Assign editor
                              </h3>
                              <Select
                                value={assignedEditor ?? ''}
                                onChange={(e) => setAssignedEditor(e.target.value)}
                                disabled={assignmentsDisabled || isAnyLoading}
                              >
                                <option value="">Unassigned</option>
                                {editors.map((editor) => (
                                  <option key={editor.id} value={editor.id ?? ''}>
                                    {editor.name || editor.email}
                                  </option>
                                ))}
                              </Select>
                              {assignmentsDisabled && (
                                <p className="text-xs text-white/40">
                                  {rosterLoadIssue
                                    ? 'Roster could not be loaded.'
                                    : 'No editors on roster.'}
                                </p>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAssign(assignedEditor || null)}
                                disabled={
                                  assignmentsDisabled || loadingState.assignment || isAnyLoading
                                }
                              >
                                {loadingState.assignment ? (
                                  <>
                                    <LoadingSpinner size="sm" />
                                    <span className="ml-2">Saving…</span>
                                  </>
                                ) : (
                                  'Save assignment'
                                )}
                              </Button>
                            </section>

                            <section className="space-y-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
                                Editor notes
                                <span className="ml-2 font-normal normal-case text-white/30">
                                  {notesDraft.length}/4000
                                </span>
                              </h3>
                              <Textarea
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                rows={4}
                                maxLength={4000}
                                disabled={isAnyLoading}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleNotesSave}
                                disabled={loadingState.notes || isAnyLoading}
                              >
                                {loadingState.notes ? (
                                  <>
                                    <LoadingSpinner size="sm" />
                                    <span className="ml-2">Saving…</span>
                                  </>
                                ) : (
                                  'Save notes'
                                )}
                              </Button>
                            </section>
                          </div>
                        </>
                      )}

                      {/* ── CONTENT TAB ── */}
                      {activeTab === 'content' && (
                        <>
                          {selectedSubmission.type === 'writing' ? (
                            <section className="space-y-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
                                Original submission
                              </h3>
                              {selectedSubmission.text_body ? (
                                <div className="max-h-[32rem] overflow-y-auto rounded-lg bg-slate-900/60 p-4 text-sm leading-relaxed text-white/70 whitespace-pre-wrap">
                                  {selectedSubmission.text_body}
                                </div>
                              ) : (
                                <p className="text-sm italic text-white/30">
                                  No text body — file upload only.
                                </p>
                              )}
                            </section>
                          ) : (
                            <section className="space-y-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
                                Visual art
                              </h3>
                              {artSignedUrls.map((url, i) =>
                                url ? (
                                  <div key={i} className="space-y-1">
                                    <div className="flex justify-center rounded-lg border border-white/10 bg-black/20 p-2">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt={
                                          selectedSubmission.art_files[i]?.split('/').pop() ??
                                          'Artwork'
                                        }
                                        className="block w-full h-auto"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-white/40">
                                      <span className="truncate min-w-0 mr-2">
                                        {selectedSubmission.art_files[i]?.split('/').pop()}
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          downloadPath(selectedSubmission.art_files[i]!)
                                        }
                                      >
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                ) : null
                              )}
                              {artSignedUrls.length === 0 &&
                                selectedSubmission.art_files.length > 0 && (
                                  <ul className="space-y-2">
                                    {selectedSubmission.art_files.map((path) => (
                                      <li
                                        key={path}
                                        className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                                      >
                                        <span className="truncate min-w-0 mr-2">
                                          {path.split('/').pop()}
                                        </span>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => downloadPath(path)}
                                        >
                                          Download
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              {selectedSubmission.art_files.length === 0 && (
                                <p className="text-sm italic text-white/30">No attachments.</p>
                              )}
                              {artSignedUrls[0] && (
                                <>
                                  <p className="md:hidden text-xs text-white/40 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                    Image editing (crop &amp; rotate) is only available on tablet or
                                    desktop.
                                  </p>
                                  <div className="hidden md:block">
                                    {(() => {
                                      const artOriginalPath =
                                        artTransform?.originalPath ??
                                        selectedSubmission.art_files[0] ??
                                        '';
                                      return (
                                        <ImageEditor
                                          submissionId={selectedSubmission.id}
                                          imageUrl={artSignedUrls[0]!}
                                          originalImageUrl={originalArtUrl ?? undefined}
                                          initialTransform={
                                            artTransform
                                              ? { ...artTransform, originalPath: artOriginalPath }
                                              : { originalPath: artOriginalPath }
                                          }
                                          onSave={() => {
                                            startTransition(() => {
                                              router.refresh();
                                            });
                                          }}
                                        />
                                      );
                                    })()}
                                  </div>
                                </>
                              )}
                            </section>
                          )}
                        </>
                      )}

                      {/* ── PUBLISH TAB ── */}
                      {activeTab === 'publish' && (
                        <section
                          className={`space-y-4 rounded-lg border p-4 ${
                            isAwaitingEiC
                              ? 'border-amber-400/40 bg-amber-400/5'
                              : 'border-white/10 bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h3
                              className={`text-xs font-semibold uppercase tracking-wide ${
                                isAwaitingEiC ? 'text-amber-300' : 'text-white/50'
                              }`}
                            >
                              {isAwaitingEiC ? 'Ready to publish' : 'Publish to issue'}
                            </h3>
                            {selectedSubmission.published &&
                              selectedSubmission.volume &&
                              selectedSubmission.issue_number && (
                                <span className="text-xs text-emerald-300">
                                  Vol. {selectedSubmission.volume}, No.{' '}
                                  {selectedSubmission.issue_number}
                                </span>
                              )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-white/40">Volume</Label>
                              <Input
                                type="number"
                                min={1}
                                placeholder="1"
                                value={volume}
                                onChange={(e) =>
                                  setVolume(e.target.value ? parseInt(e.target.value, 10) : '')
                                }
                                disabled={isAnyLoading}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-white/40">Issue</Label>
                              <Input
                                type="number"
                                min={1}
                                placeholder="1"
                                value={issueNumber}
                                onChange={(e) =>
                                  setIssueNumber(
                                    e.target.value ? parseInt(e.target.value, 10) : ''
                                  )
                                }
                                disabled={isAnyLoading}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-white/40">Date</Label>
                              <Input
                                type="date"
                                value={publishDate}
                                onChange={(e) => setPublishDate(e.target.value)}
                                disabled={isAnyLoading}
                              />
                            </div>
                          </div>

                          {selectedSubmission.type === 'writing' && (
                            <div className="space-y-2">
                              {selectedSubmission.proofread_html ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-emerald-500/40 bg-emerald-900/20 px-2.5 py-0.5 text-xs text-emerald-300">
                                    Proofread content ready
                                  </span>
                                  <span className="text-xs text-white/30">
                                    will be used automatically
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-amber-400/70">
                                  No proofread version yet — paste override below if needed
                                </p>
                              )}
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-white/30 hover:text-white/60">
                                  Override published text
                                </summary>
                                <div className="mt-2 space-y-1">
                                  <Textarea
                                    value={publishedText}
                                    onChange={(e) => setPublishedText(e.target.value)}
                                    rows={6}
                                    placeholder="Paste text here to override the proofread version."
                                    disabled={isAnyLoading}
                                  />
                                </div>
                              </details>
                            </div>
                          )}

                          <Button
                            type="button"
                            variant={isAwaitingEiC ? 'primary' : 'outline'}
                            onClick={handlePublish}
                            disabled={
                              loadingState.publish ||
                              isAnyLoading ||
                              !volume ||
                              !issueNumber ||
                              !publishDate
                            }
                          >
                            {loadingState.publish ? (
                              <>
                                <LoadingSpinner size="sm" />
                                <span className="ml-2">Publishing…</span>
                              </>
                            ) : selectedSubmission.published ? (
                              'Update publish settings'
                            ) : (
                              'Publish'
                            )}
                          </Button>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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
    </>
  );
}
