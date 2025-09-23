'use client';

import React, { useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Kind = 'writing' | 'visual';

const WRITING_CATEGORIES = [
  'Poetry',
  'Vignette',
  'Flash fiction',
  'Essay',
  'Opinion piece',
  'Free write',
  'Interview',
  'Colwell in Context',
  'Keeping Up with Keegan',
  'Literary Recommendation',
  'Other Writing',
] as const;

const VISUAL_CATEGORIES = [
  'Drawing',
  'Painting',
  'Photography',
  'Digital art',
  'Other Visual Art',
] as const;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUBMISSIONS_BUCKET = process.env.NEXT_PUBLIC_SUBMISSIONS_BUCKET || 'submissions';

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm border transition"
      style={
        active
          ? { background: '#ffd500', borderColor: '#cca800', color: '#00539f' }
          : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: 'white' }
      }
    >
      {children}
    </button>
  );
}

function Field({
  htmlFor,
  label,
  required,
  icon,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {icon ? <span className="opacity-80" aria-hidden="true">{icon}</span> : null}
      <label htmlFor={htmlFor} className="text-sm font-medium" style={{ color: '#ffd500' }}>
        {label}
        {required ? <span className="ml-1 text-red-500" aria-hidden="true">*</span> : null}
      </label>
    </div>
  );
}

export default function SubmissionForm() {
  const [kind, setKind] = useState<Kind>('visual');
  const [category, setCategory] = useState<string>('');
  const [preferredName, setPreferredName] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [contentWarnings, setContentWarnings] = useState('');
  const [textBody, setTextBody] = useState('');
  const [wordCount, setWordCount] = useState<number | ''>('');

  const [files, setFiles] = useState<FileList | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch {
      return null;
    }
  }, []);

  function computeWordCount(s: string) {
    const count = s.trim().length === 0 ? 0 : s.trim().split(/\s+/).length;
    setWordCount(count);
  }

  const currentCategories =
    kind === 'writing' ? WRITING_CATEGORIES : VISUAL_CATEGORIES;

  async function uploadVisuals(userId: string, submissionId: string) {
    if (!supabase) throw new Error('Supabase client not available');
    const uploadedPaths: string[] = [];

    if (files && files.length > 0) {
      const limit = Math.min(files.length, 5);
      for (let i = 0; i < limit; i++) {
        const f = files.item(i)!;
        const path = `user/${userId}/submissions/${submissionId}/${encodeURIComponent(f.name)}`;
        const { error } = await supabase.storage.from(SUBMISSIONS_BUCKET).upload(path, f, {
          upsert: true,
          cacheControl: '3600',
        });
        if (error) throw new Error(`Upload failed for ${f.name}: ${error.message}`);
        uploadedPaths.push(path);
      }
    }

    let coverImage: string | null = null;
    if (cover) {
      const cpath = `user/${userId}/submissions/${submissionId}/cover-${encodeURIComponent(cover.name)}`;
      const { error } = await supabase.storage.from(SUBMISSIONS_BUCKET).upload(cpath, cover, {
        upsert: true,
        cacheControl: '3600',
      });
      if (error) throw new Error(`Cover upload failed: ${error.message}`);
      coverImage = cpath;
    }

    return { artFiles: uploadedPaths, coverImage };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      // Ensure auth
      if (!supabase) throw new Error('Supabase client not available');
      const {
        data: { user },
        error: uerr,
      } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      if (!user) throw new Error('You must be signed in to submit.');

      const submissionId = crypto.randomUUID();

      let artFiles: string[] = [];
      let coverImage: string | null = null;

      if (kind === 'visual') {
        const uploaded = await uploadVisuals(user.id, submissionId);
        artFiles = uploaded.artFiles;
        coverImage = uploaded.coverImage;
        if (artFiles.length === 0) {
          throw new Error('Please attach at least one file for visual submissions.');
        }
      }

      const payload = {
        id: submissionId,
        title: title || 'Untitled',
        type: kind,
        genre: category || null,
        summary: summary || null,
        contentWarnings: contentWarnings || null,
        wordCount: typeof wordCount === 'number' ? wordCount : null,
        textBody: kind === 'writing' ? (textBody || null) : null,
        artFiles,
        coverImage,
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const issues = (data && data.issues) ? `\n${JSON.stringify(data.issues)}` : '';
        throw new Error(data.error || `Submission failed.${issues}`);
      }

      setMessage({ tone: 'ok', text: 'Submitted! You can find it under “My Submissions”.' });
      // Reset lightweight fields (don’t clear files so a user can resubmit quickly)
      setTitle('');
      setSummary('');
      setContentWarnings('');
      setTextBody('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setMessage({ tone: 'err', text: err?.message || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full" style={{ maxWidth: 'min(56rem, 100%)' }}>
      <div className="rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '2rem' }}>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold" style={{ color: '#ffd500' }}>Creative Work Submission Form</h2>
          <p className="text-slate-300">
            Please upload only <strong>ONE</strong> file per submission. There is no limit on number of submissions.
          </p>
        </div>

        <div className="mt-8 grid gap-8">
          <div className="space-y-4 max-w-2xl">
            <Field label="Type" required />
            <div className="flex flex-wrap gap-4">
              <Pill active={kind === 'visual'} onClick={() => setKind('visual')}>Visual Art</Pill>
              <Pill active={kind === 'writing'} onClick={() => setKind('writing')}>Writing</Pill>
            </div>
          </div>

          <div className="space-y-3 max-w-2xl">
            <Field label="Category" required icon={<span aria-hidden>🧭</span>} />
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
              style={{ borderColor: '#cca800' }}
            >
              <option value="" disabled className="bg-slate-900">Select Category</option>
              {(currentCategories as readonly string[]).map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 max-w-2xl">
            <Field htmlFor="preferredName" label="Preferred Name for Publishing" required icon={<span aria-hidden>👤</span>} />
            <input
              id="preferredName"
              required
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
              style={{ borderColor: '#407cb3' }}
              placeholder="How should we credit you?"
              name="preferred_name"
            />
          </div>

          <div className="space-y-3 max-w-2xl">
            <Field htmlFor="workTitle" label="Work Title" icon={<span aria-hidden>❓</span>} />
            <input
              id="workTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
              style={{ borderColor: '#407cb3' }}
              placeholder=""
              name="title"
            />
          </div>

          {kind === 'writing' && (
            <>
              <div className="space-y-3 max-w-2xl">
                <Field htmlFor="summary" label="Summary / Blurb" icon={<span aria-hidden>💬</span>} />
                <textarea
                  id="summary"
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
                  style={{ borderColor: '#407cb3' }}
                  placeholder="Give readers a quick description."
                />
              </div>

              <div className="space-y-3 max-w-2xl">
                <Field htmlFor="textBody" label="Text (required for Writing)" required icon={<span aria-hidden>✍️</span>} />
                <textarea
                  id="textBody"
                  rows={12}
                  value={textBody}
                  onChange={(e) => {
                    setTextBody(e.target.value);
                    computeWordCount(e.target.value);
                  }}
                  className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
                  style={{ borderColor: '#407cb3' }}
                  placeholder="Paste or type your piece here."
                  required={kind === 'writing'}
                />
                <div className="text-xs text-slate-400">Word count: {typeof wordCount === 'number' ? wordCount : 0}</div>
              </div>

              <div className="space-y-3 max-w-2xl">
                <Field htmlFor="warnings" label="Content Warnings" icon={<span aria-hidden>⚠️</span>} />
                <input
                  id="warnings"
                  value={contentWarnings}
                  onChange={(e) => setContentWarnings(e.target.value)}
                  className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
                  style={{ borderColor: '#407cb3' }}
                  placeholder="List anything sensitive so readers can prepare."
                  name="content_warnings"
                />
              </div>
            </>
          )}

          {kind === 'visual' && (
            <>
              <div className="space-y-3 max-w-2xl">
                <Field htmlFor="file" label="File Upload" required />
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border px-4 py-5"
                  style={{ borderColor: '#407cb3', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="text-sm text-slate-300">
                    Attach up to <span className="font-medium text-slate-200">5 files</span>. Accepted:{' '}
                    <span className="font-medium text-slate-200">image/*,application/pdf</span>
                  </div>
                  <label className="btn btn-brand cursor-pointer" style={{ background: '#ffd500', borderColor: '#cca800', color: '#0b1220' }}>
                    Browse…
                    <input
                      id="file"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => setFiles(e.currentTarget.files)}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3 max-w-2xl">
                <Field htmlFor="cover" label="Cover Image (optional)" />
                <input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCover(e.currentTarget.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border file:px-3 file:py-1.5"
                />
              </div>

              <div className="space-y-3 max-w-2xl">
                <Field htmlFor="warnings-v" label="Content Warnings" icon={<span aria-hidden>⚠️</span>} />
                <input
                  id="warnings-v"
                  value={contentWarnings}
                  onChange={(e) => setContentWarnings(e.target.value)}
                  className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none"
                  style={{ borderColor: '#407cb3' }}
                  placeholder="List anything sensitive so readers can prepare."
                  name="content_warnings"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn"
              style={{
                background: '#ffd500',
                borderColor: '#cca800',
                color: '#0b1220',
                opacity: submitting ? 0.7 : 1,
                pointerEvents: submitting ? 'none' : 'auto',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>

          {message ? (
            <p className={`text-sm ${message.tone === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

// Also export a named export to satisfy any imports that expect it.
export { SubmissionForm };
