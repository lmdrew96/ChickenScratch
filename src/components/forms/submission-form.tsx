'use client';

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { LoadingSpinner } from '@/components/shared/loading-states';


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
type SubmissionKind = 'visual' | 'writing';

type FormErrors = {
  kind?: string;
  category?: string;
  preferredName?: string;
  file?: string;
  text?: string;
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
  const categoryOptions = kind === 'writing' ? WRITING_CATEGORIES : VISUAL_CATEGORIES;
  const [category, setCategory] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [contentWarnings, setContentWarnings] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!title.trim() || !preferredName.trim()) return;
    
    try {
      setIsAutoSaving(true);
      const formData = {
        kind,
        category,
        preferredName,
        title,
        summary,
        contentWarnings,
        text
      };
      
      localStorage.setItem('submission-draft', JSON.stringify(formData));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [kind, category, preferredName, title, summary, contentWarnings, text]);

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('submission-draft');
      if (saved) {
        const draft = JSON.parse(saved);
        setKind(draft.kind || 'visual');
        setCategory(draft.category || '');
        setPreferredName(draft.preferredName || '');
        setTitle(draft.title || '');
        setSummary(draft.summary || '');
        setContentWarnings(draft.contentWarnings || '');
        setText(draft.text || '');
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  // Auto-save when content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [autoSave]);

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

    if (kind === 'visual') {
      if (pendingFiles && pendingFiles.length > 1) {
        validationErrors.file = 'Only one file can be uploaded.';
      }
      if (!file) {
        validationErrors.file = validationErrors.file ?? 'Add the piece you want to share.';
      }
    }

    if (kind === 'writing') {
      if (!text.trim()) {
        validationErrors.text = 'Please paste your writing.';
      }
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

      if (kind === 'visual' && file) {
        formData.append('file', file);
      }
      if (kind === 'writing' && text.trim()) {
        formData.append('text', text.trim());
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
      encType="multipart/form-data"
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
      <option value="" disabled className="bg-slate-900">Select Category</option>
      {categoryOptions.map((opt) => (
        <option key={opt} value={opt as string} className="bg-slate-900">{opt}</option>
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
            placeholder="Brief description of your work..."
          />
          <div className="text-xs text-slate-400 text-right">
            {summary.length}/500 characters
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="contentWarnings" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Content Warnings
          </label>
          <textarea
            id="contentWarnings"
            name="content_warnings"
            rows={2}
            value={contentWarnings}
            onChange={(event) => {
              setContentWarnings(event.target.value);
              resetFeedback();
            }}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
            placeholder="Any content warnings for sensitive topics..."
          />
          <div className="text-xs text-slate-400 text-right">
            {contentWarnings.length}/300 characters
          </div>
        </div>

        {kind === 'writing' ? (
          <div className="space-y-2">
            <label htmlFor="text" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Your Writing
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            </label>
            <textarea
              id="text"
              name="text"
              rows={12}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                resetFeedback();
              }}
              className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Characters: {text.length.toLocaleString()}</span>
              <span>Words: {text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
            </div>
            {errors.text ? <p className="text-sm text-red-400">{errors.text}</p> : null}
          </div>
        ) : null}

        {kind === 'visual' ? (
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
              <div className="space-y-2">
                <p className="text-xs text-slate-300">Selected: {file.name}</p>
                <div className="text-xs text-slate-400">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                {isUploading && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div 
                        className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Accepted formats: images or PDF, one file only.</p>
                <p className="text-xs text-slate-500">Maximum file size: 10 MB</p>
              </div>
            )}
            {errors.file ? <p className="text-sm text-red-400">{errors.file}</p> : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button type="submit" className="btn btn-accent" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Submitting…
                </>
              ) : (
                'Submit'
              )}
            </button>
            
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {isAutoSaving && (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </>
              )}
              {lastSaved && !isAutoSaving && (
                <span>
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
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
