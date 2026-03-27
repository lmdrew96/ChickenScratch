'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import type { Submission } from '@/types/database';
import { parseImageTransform } from '@/types/image-transform';
import { getSignedDownloadUrl } from '@/lib/actions/storage';
import { ImageEditor } from '@/components/committee/visual/image-editor';

import type { CommitteeRole, InboxItem, InboxSectionId, InboxAction } from './types';
import { shapeInboxItems } from './shaping';

type CommitteeInboxProps = {
  userRole: CommitteeRole;
  submissions: Submission[];
};

type PromptState =
  | {
      type: 'request_changes' | 'decline' | 'final_decline';
      submission: Submission;
      action: NonNullable<InboxAction['workflowAction']>;
      value: string;
      title: string;
      placeholder?: string;
    }
  | null;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function sectionLabel(section: InboxSectionId) {
  switch (section) {
    case 'action_required':
      return 'Action required';
    case 'waiting':
      return 'Waiting';
    case 'done':
      return 'Done';
    case 'all':
      return 'All';
  }
}

function badgeClasses(section: InboxSectionId) {
  switch (section) {
    case 'action_required':
      return 'bg-amber-500/15 text-amber-200 border-amber-400/30';
    case 'waiting':
      return 'bg-slate-500/10 text-slate-200 border-white/10';
    case 'done':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30';
    default:
      return 'bg-white/5 text-white/80 border-white/10';
  }
}

function buttonClasses(variant: InboxAction['variant']) {
  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    case 'success':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    case 'warning':
      return 'bg-amber-600 hover:bg-amber-700 text-white';
    case 'danger':
      return 'bg-rose-600 hover:bg-rose-700 text-white';
    default:
      return 'bg-white/10 hover:bg-white/15 text-white';
  }
}

export default function CommitteeInbox({ userRole, submissions }: CommitteeInboxProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<InboxSectionId>('action_required');
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<PromptState>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [artSignedUrl, setArtSignedUrl] = useState<string | null>(null);
  const [originalArtUrl, setOriginalArtUrl] = useState<string | null>(null);

  const items = useMemo(() => shapeInboxItems(submissions, userRole), [submissions, userRole]);

  const counts = useMemo(() => {
    const c: Record<InboxSectionId, number> = { action_required: 0, waiting: 0, done: 0, all: items.length };
    for (const it of items) c[it.section] += 1;
    return c;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter((it) => it.section === activeFilter);
  }, [items, activeFilter]);

  useEffect(() => {
    if (!promptState) return;
    promptTextareaRef.current?.focus();
  }, [promptState]);

  useEffect(() => {
    setArtSignedUrl(null);
    setOriginalArtUrl(null);
    if (!selected || selected.submission.type !== 'visual') return;
    const s = selected.submission;
    const t = parseImageTransform(s.image_transform);
    const artFiles = Array.isArray(s.art_files) ? (s.art_files as string[]) : [];
    const originalPath = artFiles[0] ?? s.cover_image ?? null;

    if (t?.processedPath) {
      void getSignedDownloadUrl(t.processedPath).then((r) => setArtSignedUrl(r.signedUrl));
      if (originalPath) {
        void getSignedDownloadUrl(originalPath).then((r) => setOriginalArtUrl(r.signedUrl));
      }
    } else if (originalPath) {
      void getSignedDownloadUrl(originalPath).then((r) => setArtSignedUrl(r.signedUrl));
    }
  }, [selected]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (promptState) {
        setPromptState(null);
        setIsProcessing(null);
      } else if (selected) {
        setSelected(null);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [promptState, selected]);

  async function submitWorkflowAction(submission: Submission, action: string, linkUrl?: string, comment?: string) {
    setActionError(null);
    setIsProcessing(action);

    try {
      const response = await fetch('/api/committee-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          action,
          linkUrl,
          comment,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = data?.error || 'Request failed';
        setActionError(message);
        return;
      }

      const data = (await response.json().catch(() => null)) as {
        proofread_editor_url?: string;
        file_url?: string;
        google_doc_url?: string;
      } | null;

      // Open in-app proofread editor (coordinator read-only view)
      if (data?.proofread_editor_url) {
        window.open(data.proofread_editor_url, '_blank');
      }
      // Signed file URL for visual art review (existing behaviour)
      if (data?.file_url) {
        window.open(data.file_url, '_blank');
      }
      // Legacy Google Doc URL (backward compat)
      if (data?.google_doc_url) {
        window.open(data.google_doc_url, '_blank');
      }

      setSelected(null);
      setPromptState(null);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(null);
    }
  }

  function handleAction(item: InboxItem, action: InboxAction) {
    const submission = item.submission;

    if (!action.workflowAction) {
      // Navigate to in-app proofread editor
      if (action.id === 'open_proofread_editor') {
        router.push(`/committee/proofread/${submission.id}`);
        return;
      }
      return;
    }

    if (action.requiresComment) {
      const type: NonNullable<PromptState>['type'] =
        action.workflowAction === 'final_decline'
          ? 'final_decline'
          : action.workflowAction === 'decline'
            ? 'decline'
            : 'request_changes';

      const title = action.workflowAction === 'request_changes' ? 'Request changes (message to author)' : 'Add a note';

      setPromptState({
        type,
        submission,
        action: action.workflowAction,
        value: '',
        title,
        placeholder: 'Write a short note…',
      });
      return;
    }

    void submitWorkflowAction(submission, action.workflowAction);
  }

  function renderChips() {
    const chips: InboxSectionId[] = ['action_required', 'waiting', 'done', 'all'];
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((id) => {
          const active = id === activeFilter;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveFilter(id)}
              className={cx(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              )}
            >
              {sectionLabel(id)}
              <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[11px] text-white/70">{counts[id]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Inbox</h2>
          <p className="text-sm text-slate-300">Triage what needs your attention next.</p>
        </div>
        {renderChips()}

        {actionError && (
          <div className="rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-100">
            <div className="flex items-start justify-between gap-4">
              <span>Action failed: {actionError}</span>
              <button onClick={() => setActionError(null)} className="text-red-200 hover:text-white">Dismiss</button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
            <p className="text-sm text-white/70">No submissions here.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const s = item.submission;
            const date = s.created_at ? new Date(s.created_at).toLocaleDateString() : '';

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(item)}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm transition-colors hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]', badgeClasses(item.section))}>
                        {sectionLabel(item.section)}
                      </span>
                      <span className="text-[11px] text-white/50">{item.statusLabel}</span>
                    </div>
                    <h3 className="mt-2 truncate text-sm font-semibold text-[var(--text)]">{s.title}</h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {s.type} • {s.genre || 'No genre'} {date ? `• ${date}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-white/70">Next: {item.nextActionLabel}</p>
                  </div>
                  {item.primaryAction && (
                    <div className="flex shrink-0 items-center">
                      <span className={cx('rounded-full px-2 py-1 text-[11px]', 'bg-black/20 text-white/70')}>
                        {item.primaryAction.label}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom sheet / modal */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelected(null)}
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[var(--bg)] p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-white/50">{selected.statusLabel}</p>
                <h2 className="truncate text-lg font-semibold text-[var(--text)]">{selected.submission.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-2 py-1 text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <dt className="text-xs font-medium text-white/70">Type & genre</dt>
                  <dd className="text-sm text-white/90">
                    {selected.submission.type} • {selected.submission.genre || 'No genre specified'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-white/70">Summary</dt>
                  <dd className="text-sm text-white/80">{selected.submission.summary || 'No summary provided.'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-white/70">Content warnings</dt>
                  <dd className="text-sm text-white/80">{selected.submission.content_warnings || '—'}</dd>
                </div>
              </div>

              {/* Visual art inline display */}
              {selected.submission.type === 'visual' && artSignedUrl && (
                <div className="flex justify-center rounded-xl border border-white/10 bg-black/20 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artSignedUrl}
                    alt={selected.submission.title}
                    className="block max-h-72 w-auto"
                  />
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/80">Next: {selected.nextActionLabel}</p>
                {selected.actions.length === 0 ? (
                  <p className="mt-2 text-xs text-white/60">No actions available for your role.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.actions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        disabled={Boolean(isProcessing)}
                        onClick={() => handleAction(selected, a)}
                        className={cx(
                          'rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50',
                          buttonClasses(a.variant)
                        )}
                      >
                        {isProcessing === a.workflowAction ? 'Working…' : a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Image editor for coordinators and EiC on visual submissions */}
              {selected.submission.type === 'visual' && artSignedUrl &&
                (userRole === 'submissions_coordinator' || userRole === 'editor_in_chief') && (() => {
                const t = parseImageTransform(selected.submission.image_transform);
                const artFiles = Array.isArray(selected.submission.art_files)
                  ? (selected.submission.art_files as string[]) : [];
                const artOriginalPath = t?.originalPath ?? artFiles[0] ?? selected.submission.cover_image ?? '';
                return (
                  <ImageEditor
                    submissionId={selected.submission.id}
                    imageUrl={artSignedUrl}
                    originalImageUrl={originalArtUrl ?? undefined}
                    initialTransform={t ? { ...t, originalPath: artOriginalPath } : { originalPath: artOriginalPath }}
                    onSave={() => router.refresh()}
                  />
                );
              })()}

              {selected.submission.google_docs_link && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-medium text-white/70">Links</p>
                  <div className="mt-2 text-sm">
                    <a className="block text-blue-300 hover:text-blue-200" href={selected.submission.google_docs_link} target="_blank" rel="noreferrer">
                      Google Doc (legacy)
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompt dialog */}
      {promptState && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--bg)] p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-[var(--text)]">{promptState.title}</h3>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-white/60 hover:text-white"
                onClick={() => setPromptState(null)}
              >
                ✕
              </button>
            </div>

            <textarea
              ref={promptTextareaRef}
              value={promptState.value}
              onChange={(e) => setPromptState({ ...promptState, value: e.target.value })}
              placeholder={promptState.placeholder}
              rows={5}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPromptState(null);
                  setIsProcessing(null);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const value = promptState.value.trim();
                  if (!value) return;

                  void submitWorkflowAction(promptState.submission, promptState.action, undefined, value);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


