'use client';

import { useRef, useState } from 'react';

export type CommentRow = {
  id: string;
  body: string;
  created_at: Date | string | null;
  author_id: string;
  author_name: string | null;
  author_pronouns: string | null;
};

type Props = {
  initialComments: CommentRow[];
  targetType: 'submission' | 'issue';
  targetId: string;
  canPost: boolean;
  canModerate: boolean;
  currentUserId: string | null;
};

const MAX_BODY = 1000;

function relativeTime(date: Date | string | null): string {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CommentsClient({
  initialComments,
  targetType,
  targetId,
  canPost,
  canModerate,
  currentUserId,
}: Props) {
  const [list, setList] = useState<CommentRow[]>(initialComments);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to post');
      setList((prev) => [...prev, data.comment as CommentRow]);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete');
      }
      setList((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  }

  return (
    <section className="mt-10 space-y-6">
      <h2 className="text-base font-semibold text-white/70 uppercase tracking-wide">
        Comments
        {list.length > 0 && (
          <span className="ml-2 text-sm font-normal normal-case text-white/30">{list.length}</span>
        )}
      </h2>

      {/* Comment list */}
      {list.length === 0 ? (
        <p className="text-sm text-white/30">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {list.map((c) => {
            const isOwn = c.author_id === currentUserId;
            const canDelete = isOwn || canModerate;

            return (
              <div key={c.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-white/80">
                    {c.author_name ?? 'Anonymous'}
                    {c.author_pronouns && (
                      <span className="ml-1.5 text-xs font-normal text-white/35">
                        ({c.author_pronouns})
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-white/25">{relativeTime(c.created_at)}</span>
                    {canDelete && (
                      confirmDeleteId === c.id ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-red-400 hover:text-red-300 transition"
                          >
                            Confirm
                          </button>
                          <span className="text-white/20">·</span>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-white/40 hover:text-white/70 transition"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="text-xs text-white/20 hover:text-red-400 transition"
                          aria-label="Delete comment"
                        >
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </div>
                <p className="text-sm text-white/60 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Post form */}
      {canPost ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Leave a comment…"
            maxLength={MAX_BODY}
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 transition"
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${body.length > MAX_BODY * 0.9 ? 'text-amber-400' : 'text-white/25'}`}>
              {body.length}/{MAX_BODY}
            </span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[#003b72] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>
      ) : (
        <p className="text-sm text-white/30 italic">
          {currentUserId
            ? 'Only members and alumni can leave comments.'
            : 'Sign in as a member or alumni to leave a comment.'}
        </p>
      )}
    </section>
  );
}
