'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

type Kind = 'visual' | 'writing';

const CATEGORY_OPTIONS: Record<Kind, string[]> = {
  visual: ['Photography', 'Illustration', 'Comics', 'Mixed media', 'Poster', 'Other'],
  writing: ['Poetry', 'Short fiction', 'Essay', 'Creative non-fiction', 'Review', 'Other'],
};

function Field({
  label,
  required,
  htmlFor,
  hint,
  icon,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mx-auto form-section w-full">
      <div className="flex items-center gap-2">
        {icon ? <span className="opacity-80">{icon}</span> : null}
        <label htmlFor={htmlFor} className="text-sm font-medium" style={{ color: '#ffd500' }}>
          {label}
          {required ? <span className="ml-1 text-red-500" aria-hidden="true">*</span> : null}
        </label>
        {hint ? <div className="ml-auto text-xs text-slate-400">{hint}</div> : null}
      </div>
    </div>
  );
}

function Pill({
  active,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      type="button"
      className={[
        'px-3 py-1.5 rounded-full text-sm border transition',
        'text-current',
      ].join(' ')}
      style={{ color: active ? '#00539f' : '#ffffff', background: active ? '#ffd500' : 'rgba(255,255,255,0.06)',
        borderColor: active ? '#cca800' : 'rgba(255,255,255,0.15)',
      }}
    >
      {children}
    </button>
  );
}

export default function SubmissionForm() {
  const router = useRouter();
  const [kind, setKind] = React.useState<Kind>('visual');
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const accept =
    kind === 'visual' ? 'image/*,application/pdf' : '.pdf,.txt,.md,.rtf,.doc,.docx';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const fd = new FormData(e.currentTarget);
    fd.set('type', kind);

    const file = fileInputRef.current?.files?.[0] ?? null;
    if (!file) {
      alert('Please attach a file.');
      return;
    }
    fd.delete('file');
    fd.append('file', file);

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', { method: 'POST', body: fd });
      if (res.ok) return router.push('/mine');
      alert((await res.text().catch(() => 'Submission failed.')) || 'Submission failed.');
    } catch (err: any) {
      alert(err?.message || 'Network error while submitting.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <form
        onSubmit={onSubmit}
        className="card w-full p-6 md:p-8 form-card form-section"
        style={{ borderColor: 'rgba(255,255,255,.13)', background: 'rgba(255,255,255,.03)' }}
      >
        {/* Title */}
        <div className="form-section">
          <h2 className="text-2xl font-semibold" style={{ color: '#ffd500' }}>
            Creative Work Submission Form
          </h2>
          <p className="text-slate-300">
            Please upload only <strong>ONE</strong> file per submission. There is no limit on number
            of submissions.
          </p>
        </div>

        {/* Type */}
        <div className="form-section">
          <Field label="Type" required />
          <div className="flex flex-wrap gap-4">
            <Pill active={kind === 'visual'} onClick={() => setKind('visual')}>
              Visual Art
            </Pill>
            <Pill active={kind === 'writing'} onClick={() => setKind('writing')}>
              Writing
            </Pill>
          </div>
        </div>

        {/* Category */}
        <div className="form-section">
          <Field label="Category" required icon={<span aria-hidden>🧭</span>} />
          <select
            name="category"
            required
            className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none field-narrow"
            style={{ borderColor: '#cca800' }}
            defaultValue=""
          >
            <option value="" disabled className="bg-slate-900">
              Select Category
            </option>
            {CATEGORY_OPTIONS[kind].map((opt) => (
              <option key={opt} value={opt} className="bg-slate-900">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Preferred Name */}
        <div className="form-section">
          <Field
            label="Preferred Name for Publishing"
            required
            icon={<span aria-hidden>👤</span>}
            htmlFor="preferredName"
          />
          <input
            id="preferredName"
            name="preferred_name"
            required
            className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none field-narrow"
            style={{ borderColor: '#407cb3' }}
            placeholder="How should we credit you?"
          />
        </div>

        {/* Work Title */}
        <div className="form-section">
          <Field label="Work Title" icon={<span aria-hidden>❓</span>} htmlFor="workTitle" />
          <input
            id="workTitle"
            name="title"
            className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none field-narrow"
            style={{ borderColor: '#407cb3' }}
            placeholder=""
          />
        </div>

        {/* Summary / Blurb */}
        <div className="form-section">
          <Field label="Summary / Blurb" icon={<span aria-hidden>💬</span>} htmlFor="summary" />
          <textarea
            id="summary"
            name="summary"
            rows={4}
            className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none field-narrow"
            style={{ borderColor: '#407cb3' }}
            placeholder="Give readers a quick description."
          />
        </div>

        {/* Content Warnings */}
        <div className="form-section">
          <Field label="Content Warnings" icon={<span aria-hidden>⚠️</span>} htmlFor="warnings" />
          <input
            id="warnings"
            name="content_warnings"
            className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none field-narrow"
            style={{ borderColor: '#407cb3' }}
            placeholder="List anything sensitive so readers can prepare."
          />
        </div>

        {/* File Upload */}
        <div className="form-section">
          <Field label="File Upload" required htmlFor="file" />
          <div
            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-5"
            style={{ borderColor: '#407cb3', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="text-sm text-slate-300">
              Attach exactly one file. Accepted for this type:{' '}
              <span className="font-medium text-slate-200">{accept}</span>
            </div>
            <label className="btn btn-brand cursor-pointer">
              Browse…
              <input
                ref={fileInputRef}
                id="file"
                name="file"
                type="file"
                required
                accept={accept}
                className="sr-only field-narrow"
                onChange={(e) => {
                  const files = e.currentTarget.files;
                  if (files && files.length > 1) {
                    const d = new DataTransfer();
                    d.items.add(files[0]);
                    e.currentTarget.files = d.files;
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn"
            style={{
              background: '#ffd500',
              borderColor: '#cca800',
              color: '#0b1220',
              opacity: submitting ? 0.8 : 1,
              pointerEvents: submitting ? 'none' : 'auto',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
