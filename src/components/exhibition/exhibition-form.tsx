'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const WRITING_MEDIUMS = [
  { value: 'poetry', label: 'Poetry' },
  { value: 'prose', label: 'Prose / Fiction' },
  { value: 'creative_nonfiction', label: 'Creative Nonfiction' },
  { value: 'other', label: 'Other' },
];

const VISUAL_MEDIUMS = [
  { value: 'painting', label: 'Painting' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'photography', label: 'Photography' },
  { value: 'digital_art', label: 'Digital Art' },
  { value: 'mixed_media', label: 'Mixed Media' },
  { value: 'other', label: 'Other' },
];

const DISPLAY_FORMATS = [
  { value: 'print_provided', label: "I'll bring a printed copy" },
  { value: 'needs_printing', label: 'I need it printed' },
  { value: 'digital_display', label: 'Digital display only' },
  { value: 'physical_original', label: "I'll bring the physical original" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ExhibitionSubmissionForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [form, setForm] = useState({
    preferred_name: '',
    title: '',
    type: '',
    medium: '',
    description: '',
    artist_statement: '',
    content_warnings: '',
    text_body: '',
    display_format: '',
    display_notes: '',
  });

  const [artFile, setArtFile] = useState<File | null>(null);
  const [artFileError, setArtFileError] = useState<string | null>(null);

  const set = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Reset medium when type changes
      if (key === 'type') next.medium = '';
      return next;
    });
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setArtFileError(null);
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setArtFileError('File must be smaller than 10 MB.');
        e.target.value = '';
        return;
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (!allowed.includes(file.type)) {
        setArtFileError('Only JPG, PNG, WebP, GIF, and PDF files are allowed.');
        e.target.value = '';
        return;
      }
    }
    setArtFile(file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let filePath: string | null = null;
      let fileSize: number | null = null;

      if (form.type === 'visual') {
        if (!artFile) {
          setError('Please select a file to upload.');
          setSubmitting(false);
          return;
        }
        setUploadProgress('Getting upload URL…');
        const urlRes = await fetch(
          `/api/exhibition/submit?filename=${encodeURIComponent(artFile.name)}&contentType=${encodeURIComponent(artFile.type)}&fileSize=${artFile.size}`,
        );
        if (!urlRes.ok) {
          const data = await urlRes.json().catch(() => ({})) as { error?: string };
          throw new Error(data.error ?? 'Failed to get upload URL.');
        }
        const { uploadUrl, filePath: fp } = await urlRes.json() as { uploadUrl: string; filePath: string };

        setUploadProgress('Uploading file…');
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': artFile.type },
          body: artFile,
        });
        if (!uploadRes.ok) throw new Error('File upload failed. Please try again.');

        filePath = fp;
        fileSize = artFile.size;
        setUploadProgress(null);
      }

      const wordCount = form.type === 'writing' && form.text_body
        ? form.text_body.trim().split(/\s+/).filter(Boolean).length
        : null;

      const payload: Record<string, unknown> = {
        preferred_name: form.preferred_name || null,
        title: form.title,
        type: form.type,
        medium: form.medium,
        description: form.description || null,
        artist_statement: form.artist_statement || null,
        content_warnings: form.content_warnings || null,
      };

      if (form.type === 'writing') {
        payload.text_body = form.text_body;
        payload.word_count = wordCount;
      } else {
        payload.file_url = filePath;
        payload.file_name = artFile?.name ?? null;
        payload.file_type = artFile?.type ?? null;
        payload.file_size = fileSize;
        payload.display_format = form.display_format;
        payload.display_notes = form.display_notes || null;
      }

      const res = await fetch('/api/exhibition/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? 'Submission failed.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setUploadProgress(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-white">Submission received!</h2>
        <p className="text-slate-300">
          Thank you for sharing your work. We&rsquo;ll review it and email you with our decision.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setSuccess(false);
              setForm({
                preferred_name: '',
                title: '',
                type: '',
                medium: '',
                description: '',
                artist_statement: '',
                content_warnings: '',
                text_body: '',
                display_format: '',
                display_notes: '',
              });
              setArtFile(null);
            }}
            className="btn"
          >
            Submit another
          </button>
          <button type="button" onClick={() => router.push('/exhibition/mine')} className="btn btn-accent">
            View my submissions
          </button>
        </div>
      </div>
    );
  }

  const mediums = form.type === 'writing' ? WRITING_MEDIUMS : form.type === 'visual' ? VISUAL_MEDIUMS : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Preferred name */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300" htmlFor="preferred_name">
          Preferred name / credit <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="preferred_name"
          type="text"
          className="form-input w-full"
          placeholder="How you'd like to be credited"
          value={form.preferred_name}
          onChange={(e) => set('preferred_name', e.target.value)}
        />
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300" htmlFor="title">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          className="form-input w-full"
          placeholder="Title of your piece"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      {/* Type */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300" htmlFor="type">
          Type <span className="text-red-400">*</span>
        </label>
        <select
          id="type"
          required
          className="form-input w-full"
          value={form.type}
          onChange={(e) => set('type', e.target.value)}
        >
          <option value="">Select type…</option>
          <option value="writing">Writing</option>
          <option value="visual">Visual Art</option>
        </select>
      </div>

      {/* Medium */}
      {form.type && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300" htmlFor="medium">
            Medium <span className="text-red-400">*</span>
          </label>
          <select
            id="medium"
            required
            className="form-input w-full"
            value={form.medium}
            onChange={(e) => set('medium', e.target.value)}
          >
            <option value="">Select medium…</option>
            {mediums.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Writing: text body */}
      {form.type === 'writing' && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300" htmlFor="text_body">
            Your writing <span className="text-red-400">*</span>
          </label>
          <textarea
            id="text_body"
            required
            rows={14}
            className="form-input w-full resize-y"
            placeholder="Paste or type your piece here…"
            value={form.text_body}
            onChange={(e) => set('text_body', e.target.value)}
          />
          {form.text_body && (
            <p className="text-xs text-slate-500">
              {form.text_body.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          )}
        </div>
      )}

      {/* Visual art: file upload */}
      {form.type === 'visual' && (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300" htmlFor="art_file">
              Upload your artwork <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-slate-500">JPG, PNG, WebP, GIF, or PDF — max 10 MB</p>
            <input
              id="art_file"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
              className="form-input w-full"
              onChange={handleFileChange}
            />
            {artFileError && <p className="text-xs text-red-400">{artFileError}</p>}
            {artFile && !artFileError && (
              <p className="text-xs text-slate-400">
                {artFile.name} ({(artFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Display format */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300" htmlFor="display_format">
              Display format <span className="text-red-400">*</span>
            </label>
            <select
              id="display_format"
              required
              className="form-input w-full"
              value={form.display_format}
              onChange={(e) => set('display_format', e.target.value)}
            >
              <option value="">How do you want it displayed?</option>
              {DISPLAY_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Display notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300" htmlFor="display_notes">
              Display notes <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              id="display_notes"
              rows={3}
              className="form-input w-full resize-y"
              placeholder="Size requirements, framing needs, easel needed, etc."
              value={form.display_notes}
              onChange={(e) => set('display_notes', e.target.value)}
            />
          </div>
        </>
      )}

      {/* Description */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300" htmlFor="description">
          Brief description <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          className="form-input w-full resize-y"
          placeholder="A short description of your piece"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      {/* Artist statement */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300" htmlFor="artist_statement">
          Artist statement <span className="text-slate-500">(optional, max 500 words)</span>
        </label>
        <textarea
          id="artist_statement"
          rows={5}
          className="form-input w-full resize-y"
          placeholder="What inspired this piece? What would you like viewers to take away?"
          value={form.artist_statement}
          onChange={(e) => set('artist_statement', e.target.value)}
        />
      </div>

      {/* Content warnings */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300" htmlFor="content_warnings">
          Content warnings <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="content_warnings"
          type="text"
          className="form-input w-full"
          placeholder="e.g. violence, strong language, flashing images"
          value={form.content_warnings}
          onChange={(e) => set('content_warnings', e.target.value)}
        />
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-accent w-full disabled:opacity-50"
        >
          {submitting ? (uploadProgress ?? 'Submitting…') : 'Submit your work'}
        </button>
      </div>
    </form>
  );
}
