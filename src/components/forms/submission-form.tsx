'use client';

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/loading-states';
import { ErrorMessage, SuccessMessage, FieldError } from '@/components/ui/feedback';
import { useFeedback } from '@/hooks/use-feedback';
import {
  CharacterCount,
  HelperText,
  AutoSaveIndicator,
  RequiredIndicator,
  OptionalIndicator,
  ProgressSteps,
} from '@/components/ui/form-helpers';


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

export function SubmissionForm(_props: SubmissionFormProps = {}) {
  const router = useRouter();
  const [kind, setKind] = useState<SubmissionKind>('visual');
  const categoryOptions = kind === 'writing' ? WRITING_CATEGORIES : VISUAL_CATEGORIES;
  const [category, setCategory] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [contentWarnings, setContentWarnings] = useState('');
  const [text, setText] = useState('');
  const [writingFile, setWritingFile] = useState<File | null>(null);
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const writingFileInputRef = useRef<HTMLInputElement | null>(null);
  const visualFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { feedback, showSuccess, showError, clearFeedback } = useFeedback();
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const formSteps = ['Basic Info', 'Content', 'Review'];

  // Update step based on form completion
  useEffect(() => {
    if (!kind || !category || !preferredName.trim()) {
      setCurrentStep(0);
    } else if (kind === 'visual' && !visualFile) {
      setCurrentStep(1);
    } else if (kind === 'writing' && !writingFile) {
      setCurrentStep(1);
    } else {
      setCurrentStep(2);
    }
  }, [kind, category, preferredName, visualFile, writingFile]);

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
    } catch {
      // Silently fail auto-save
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
    } catch {
      // Silently fail draft loading
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

  function handleWritingFileChange(event: ChangeEvent<HTMLInputElement>) {
    clearFeedback();
    const files = event.target.files;

    if (!files || files.length === 0) {
      setWritingFile(null);
      setErrors((prev) => ({ ...prev, file: undefined }));
      return;
    }

    if (files.length > 1) {
      setErrors((prev) => ({ ...prev, file: 'Please upload a single file.' }));
      setWritingFile(null);
      event.target.value = '';
      return;
    }

    const nextFile = files[0];
    if (!nextFile) return;

    // Validate file type for writing submissions
    const allowedTypes = [
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf', // .pdf
      'text/plain', // .txt
    ];

    const allowedExtensions = ['.doc', '.docx', '.pdf', '.txt'];
    const fileExtension = nextFile.name.toLowerCase().substring(nextFile.name.lastIndexOf('.'));

    if (!allowedTypes.includes(nextFile.type) && !allowedExtensions.includes(fileExtension)) {
      setErrors((prev) => ({
        ...prev,
        file: 'Please upload a .doc, .docx, .pdf, or .txt file.'
      }));
      setWritingFile(null);
      event.target.value = '';
      return;
    }

    setWritingFile(nextFile);
    setErrors((prev) => ({ ...prev, file: undefined }));
  }

  function handleVisualFileChange(event: ChangeEvent<HTMLInputElement>) {
    clearFeedback();
    const files = event.target.files;

    if (!files || files.length === 0) {
      setVisualFile(null);
      setErrors((prev) => ({ ...prev, file: undefined }));
      return;
    }

    if (files.length > 1) {
      setErrors((prev) => ({ ...prev, file: 'Please upload a single file.' }));
      setVisualFile(null);
      event.target.value = '';
      return;
    }

    const nextFile = files[0];
    if (!nextFile) return;
    setVisualFile(nextFile);
    setErrors((prev) => ({ ...prev, file: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

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

    if (kind === 'visual') {
      const pendingVisualFiles = visualFileInputRef.current?.files;
      if (pendingVisualFiles && pendingVisualFiles.length > 1) {
        validationErrors.file = 'Only one file can be uploaded.';
      }
      if (!visualFile) {
        validationErrors.file = validationErrors.file ?? 'Add the piece you want to share.';
      }
    }

    if (kind === 'writing') {
      const pendingWritingFiles = writingFileInputRef.current?.files;
      if (pendingWritingFiles && pendingWritingFiles.length > 1) {
        validationErrors.file = 'Only one file can be uploaded.';
      }
      if (!writingFile) {
        validationErrors.file = validationErrors.file ?? 'Please upload your writing file (.doc, .docx, .pdf, or .txt).';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      formData.append('title', title.trim() || `${category} by ${preferredName.trim()}`);
      formData.append('type', kind);
      formData.append('preferredName', preferredName.trim());
      
      if (category) formData.append('genre', category);
      if (summary.trim()) formData.append('summary', summary.trim());
      if (contentWarnings.trim()) formData.append('contentWarnings', contentWarnings.trim());

      // Handle file uploads
      if (kind === 'writing' && writingFile) {
        formData.append('file', writingFile);
      }

      if (kind === 'visual' && visualFile) {
        formData.append('file', visualFile);
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
        showError(message, 'Submission Failed');
        return;
      }

      // Clear draft on successful submission
      localStorage.removeItem('submission-draft');
      showSuccess('Your submission has been received and will be reviewed by our editorial team.', 'Submission Successful', true);
      
      // Redirect after showing success message
      setTimeout(() => {
        router.push('/mine');
      }, 2000);
    } catch {
      showError(
        'Unable to connect to the server. Please check your internet connection and try again.',
        'Network Error'
      );
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
        {/* Progress Indicator */}
        <ProgressSteps steps={formSteps} currentStep={currentStep} />
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Type
            <RequiredIndicator />
          </legend>
          <HelperText>Choose the type of work you&apos;re submitting</HelperText>
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
          <FieldError error={errors.kind} />
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Category
            <RequiredIndicator />
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
          <HelperText>Select the category that best describes your work</HelperText>
          <FieldError error={errors.category} />
        </div>

        <div className="space-y-2">
          <label htmlFor="preferred_name" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Preferred Name for Publishing
            <RequiredIndicator />
          </label>
          <input
            id="preferred_name"
            name="preferred_name"
            type="text"
            aria-required="true"
            value={preferredName}
            onChange={handlePreferredNameChange}
            onFocus={clearFeedback}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
          <HelperText>This is how your name will appear in the publication</HelperText>
          <FieldError error={errors.preferredName} />
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Work Title
            <OptionalIndicator />
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              clearFeedback();
            }}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
          />
          <CharacterCount current={title.length} max={200} />
        </div>

        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Summary / Blurb
            <OptionalIndicator />
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={4}
            value={summary}
            onChange={(event) => {
              setSummary(event.target.value);
              clearFeedback();
            }}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
            placeholder="Brief description of your work..."
          />
          <CharacterCount current={summary.length} max={500} />
          <HelperText>A short description to accompany your work in the publication</HelperText>
        </div>

        <div className="space-y-2">
          <label htmlFor="contentWarnings" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Content Warnings
            <OptionalIndicator />
          </label>
          <textarea
            id="contentWarnings"
            name="content_warnings"
            rows={2}
            value={contentWarnings}
            onChange={(event) => {
              setContentWarnings(event.target.value);
              clearFeedback();
            }}
            className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
            placeholder="Any content warnings for sensitive topics..."
          />
          <CharacterCount current={contentWarnings.length} max={300} />
          <HelperText>
            List any sensitive content (e.g., violence, explicit language, mature themes)
          </HelperText>
        </div>

        {kind === 'writing' ? (
          <div className="space-y-2">
            <label htmlFor="writing-file" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Upload Your Writing
              <RequiredIndicator />
            </label>
            <input
              id="writing-file"
              name="writing-file"
              ref={writingFileInputRef}
              type="file"
              accept=".doc,.docx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain"
              aria-required="true"
              onChange={handleWritingFileChange}
              className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 focus:border-[var(--accent)]"
            />
            {writingFile && (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">Selected: {writingFile.name}</p>
                <div className="text-xs text-slate-400">
                  Size: {(writingFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Accepted formats: .doc, .docx, .pdf, .txt</p>
              <p className="text-xs text-slate-500">Maximum file size: 10 MB</p>
            </div>
            <HelperText>Upload your complete work as a document file</HelperText>
            <FieldError error={errors.file} />
          </div>
        ) : null}

        {kind === 'visual' ? (
          <div className="space-y-2">
            <label htmlFor="visual-file" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Upload Your Visual Art
              <RequiredIndicator />
            </label>
            <input
              id="visual-file"
              name="visual-file"
              ref={visualFileInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp,application/pdf"
              aria-required="true"
              onChange={handleVisualFileChange}
              className="w-full rounded-xl border border-slate-500/40 bg-transparent px-3 py-2 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 focus:border-[var(--accent)]"
            />
            {visualFile && (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">Selected: {visualFile.name}</p>
                <div className="text-xs text-slate-400">
                  Size: {(visualFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Accepted formats: .jpg, .png, .gif, .webp, or PDF</p>
              <p className="text-xs text-slate-500">Maximum file size: 10 MB</p>
            </div>
            <FieldError error={errors.file} />
          </div>
        ) : null}

        <div className="space-y-3">
          {/* Feedback Messages */}
          {feedback.type === 'success' && (
            <SuccessMessage
              title={feedback.title}
              message={feedback.message}
              onDismiss={clearFeedback}
            />
          )}
          
          {feedback.type === 'error' && (
            <ErrorMessage
              title={feedback.title}
              message={feedback.message}
              actions={[
                {
                  label: 'Try Again',
                  onClick: () => {
                    clearFeedback();
                    // Optionally scroll to top of form
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  },
                  variant: 'primary'
                }
              ]}
              onDismiss={clearFeedback}
            />
          )}
            
            <div className="flex items-center justify-between flex-wrap gap-4">
            <button type="submit" className="btn btn-accent" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Submitting…
                </>
              ) : (
                'Submit for Review'
              )}
            </button>
            
            <AutoSaveIndicator isSaving={isAutoSaving} lastSaved={lastSaved} />
          </div>
          <HelperText>
            Your work will be reviewed by our editorial team. You&apos;ll receive an email notification about the status.
          </HelperText>
        </div>
      </div>
    </form>
  );
}

export { SubmissionForm as default };
