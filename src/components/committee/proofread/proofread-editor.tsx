'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type ProofreadEditorProps = {
  submissionId: string;
  initialHtml: string | null;
  googleDocsLink: string | null;
  readOnly?: boolean;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Keep editor focus
        onClick();
      }}
      disabled={disabled}
      className={`rounded px-2 py-1 text-sm font-medium transition ${
        active
          ? 'bg-amber-400/20 text-amber-300'
          : 'text-white/60 hover:bg-white/10 hover:text-white'
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export function ProofreadEditor({
  submissionId,
  initialHtml,
  googleDocsLink,
  readOnly = false,
}: ProofreadEditorProps) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isCommitting, setIsCommitting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef<string>(initialHtml ?? '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: initialHtml ?? '',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate({ editor }) {
      if (readOnly) return;
      const html = editor.getHTML();
      latestHtmlRef.current = html;

      // Debounced autosave
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveState('saving');
      saveTimerRef.current = setTimeout(() => {
        void saveHtml(html);
      }, 800);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveHtml = useCallback(
    async (html: string) => {
      try {
        const response = await fetch(`/api/submissions/${submissionId}/proofread`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html }),
        });
        setSaveState(response.ok ? 'saved' : 'error');
      } catch {
        setSaveState('error');
      }
    },
    [submissionId]
  );

  async function handleCommit() {
    if (!editor) return;
    setIsCommitting(true);

    // Flush any pending save first
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveHtml(latestHtmlRef.current);

    try {
      const response = await fetch('/api/committee-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          action: 'commit',
        }),
      });

      if (response.ok) {
        router.push('/committee');
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error ?? 'Commit failed. Please try again.');
      }
    } catch {
      alert('Commit failed. Please try again.');
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legacy Google Doc banner */}
      {googleDocsLink && !initialHtml && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          This submission was previously edited in Google Docs.{' '}
          <a
            href={googleDocsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-100"
          >
            Open the Google Doc ↗
          </a>{' '}
          to copy your work, then paste it into the editor below.
        </div>
      )}

      {/* No content banner (PDF or empty) */}
      {!initialHtml && !googleDocsLink && !readOnly && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
          Content could not be imported automatically (e.g. PDF). Paste or type the text directly below.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {/* Toolbar — only for editable mode */}
        {!readOnly && editor && (
          <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 py-2">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
            >
              B
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
            >
              <em>I</em>
            </ToolbarButton>

            <div className="mx-1 h-4 w-px bg-white/15" />

            {([1, 2, 3] as const).map((level) => (
              <ToolbarButton
                key={level}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                active={editor.isActive('heading', { level })}
              >
                H{level}
              </ToolbarButton>
            ))}

            <div className="mx-1 h-4 w-px bg-white/15" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
            >
              • List
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
            >
              1. List
            </ToolbarButton>

            <div className="ml-auto flex items-center gap-2 text-xs text-white/40">
              {saveState === 'saving' && <span>Saving…</span>}
              {saveState === 'saved' && <span className="text-emerald-400">Saved</span>}
              {saveState === 'error' && <span className="text-rose-400">Save failed</span>}
            </div>
          </div>
        )}

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-sm max-w-none px-5 py-4 focus-within:outline-none [&_.ProseMirror]:min-h-[24rem] [&_.ProseMirror]:outline-none"
        />
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/committee')}
            className="text-sm text-white/50 hover:text-white/80"
          >
            ← Back to inbox
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={isCommitting}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {isCommitting ? 'Committing…' : 'Commit proofreading'}
          </button>
        </div>
      )}

      {readOnly && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => router.push('/committee')}
            className="text-sm text-white/50 hover:text-white/80"
          >
            ← Back to inbox
          </button>
        </div>
      )}
    </div>
  );
}
