'use client';

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

type SubmissionKind = 'visual' | 'writing';

type FormErrors = {
  kind?: string;
  category?: string;
  preferredName?: string;
  file?: string;
};

type SubmissionFormProps = {
  mode?: 'create' | 'edit';
  submission?: unknown;
  onSuccess?: (submissionId: string) => void;
  redirectTo?: string;
};

const CATEGORY_OPTIONS = ['Photography', 'Illustration', 'Comics', 'Mixed media', 'Poster', 'Other'];

export function SubmissionForm(props: SubmissionFormProps = {}) {
  void props;
  const [kind, setKind] = useState<SubmissionKind>('visual');
  const [category, setCategory] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [contentWarnings, setContentWarnings] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleKindChange(next: SubmissionKind) {
    setKind(next);
    setErrors((prev) => ({ ...prev, kind: undefined }));
  }

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    setCategory(event.target.value);
    setErrors((prev) => ({ ...prev, category: undefined }));
  }

  function handlePreferredNameChange(event: ChangeEvent<HTMLInputElement>) {
    setPreferredName(event.target.value);
    setErrors((prev) => ({ ...prev, preferredName: undefined }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFeedback(null);
    const files = event.target.files;

    if (!files || files.length === 0) {
      setFile(null);
      setErrors((prev) => ({ ...prev, file: undefined }));
      return;
    }

    if (files.length > 1) {
      setErrors((prev) => ({ ...prev, file: 'Please upload a single file.' }));
      setFile(null);
      event.target.value = '';
      return;
    }

    const nextFile = files[0];
    setFile(nextFile);
    setErrors((prev) => ({ ...prev, file: undefined }));
  }

  function resetFeedback() {
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();

    const validationErrors: FormErrors = {};

    if (!kind) {
      validationErrors.kind = 'Choose a type to continue.';
    }

    if (!category) {
      validationErrors.category = 'Select a category that best fits your piece.';
    }

    if (!preferredName.trim()) {
      validationErrors.preferredName = 'Preferred name is required.';
    }

    const pendingFiles = fileInputRef.current?.files;
    if (pendingFiles && pendingFiles.length > 1) {
      validationErrors.file = 'Only one file can be uploaded.';
    }

    if (!file) {
      validationErrors.file = validationErrors.file ?? 'Add the piece you want to share.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('kind', kind);
      formData.append('category', category);
      formData.append('preferred_name', preferredName.trim());
      formData.append('title', title.trim());
      formData.append('summary', summary.trim());
      formData.append('content_warnings', contentWarnings.trim());

      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let message = 'We could not submit your work. Please try again.';
        try {
          const data = await response.json();
          if (data && typeof data.error === 'string' && data.error.trim().length > 0) {
            message = data.error;
          }
        } catch {
          // ignore JSON parsing issues
        }
        setFeedback({ type: 'error', message });
        return;
      }

      setFeedback({ type: 'success', message: 'Submission received! Redirecting…' });
      window.location.href = '/mine';
    } catch {
      setFeedback({ type: 'error', message: 'Network error: unable to submit right now.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="form-card mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:max-w-3xl md:p-8"
    >
      <div className="space-y-6">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Type
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {(['visual', 'writing'] as SubmissionKind[]).map((option) => {
              const label = option === 'visual' ? 'Visual Art' : 'Writing';
              const isActive = kind === option;
              return (
                <button
                  key={option}
                  type="button"
                  className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    isActive
                      ? 'border-transparent bg-[var(--accent)] text-[#00539f]'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:text-white'
                  }`}
                  aria-pressed={isActive}
                  onClick={() => handleKindChange(option)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {errors.kind ? <p className="text-sm text-red-400">{errors.kind}</p> : null}
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Category
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <select
            id="category"
            name="category"
            aria-required="true"
            value={category}
            onChange={handleCategoryChange}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          >
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-[#0b1220] text-slate-200">
                {option}
              </option>
            ))}
          </select>
          {errors.category ? <p className="text-sm text-red-400">{errors.category}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="preferred_name" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Preferred Name for Publishing
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="preferred_name"
            name="preferred_name"
            type="text"
            aria-required="true"
            value={preferredName}
            onChange={handlePreferredNameChange}
            onFocus={resetFeedback}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
          {errors.preferredName ? <p className="text-sm text-red-400">{errors.preferredName}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Work Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              resetFeedback();
            }}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Summary / Blurb
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={4}
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
              resetFeedback();
            }}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="content_warnings" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Content Warnings
          </label>
          <input
            id="content_warnings"
            name="content_warnings"
            type="text"
            value={contentWarnings}
            onChange={(event) => {
              setContentWarnings(event.target.value);
              resetFeedback();
            }}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="file" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            File Upload
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="file"
            name="file"
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            aria-required="true"
            onChange={handleFileChange}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 focus:border-[var(--accent)]"
          />
          {file ? (
            <p className="text-xs text-slate-300">Selected: {file.name}</p>
          ) : (
            <p className="text-xs text-slate-400">Accepted formats: images or PDF, one file only.</p>
          )}
          {errors.file ? <p className="text-sm text-red-400">{errors.file}</p> : null}
        </div>

        <div className="space-y-3">
          <button type="submit" className="btn btn-accent" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </button>
          {feedback ? (
            <p className={`text-sm ${feedback.type === 'error' ? 'text-red-400' : 'text-emerald-300'}`}>
              {feedback.message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export { SubmissionForm as default };
