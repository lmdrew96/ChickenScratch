'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { useSupabase } from '@/components/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { SUBMISSION_TYPES, type SubmissionType } from '@/lib/constants';
import type { Submission } from '@/types/database';

const ART_BUCKET = 'art';

type UploadableFile = {
  id: string;
  name: string;
  size: number;
  path?: string;
  file?: File;
};

type SubmissionFormProps = {
  mode: 'create' | 'edit';
  submission?: Submission;
  onSuccess?: (submissionId: string) => void;
  redirectTo?: string;
};

const emptySubmission = {
  title: '',
  type: 'writing' as SubmissionType,
  genre: '',
  summary: '',
  content_warnings: '',
  text_body: '',
};

export function SubmissionForm({ mode, submission, onSuccess, redirectTo }: SubmissionFormProps) {
  const supabase = useSupabase();
  const { notify } = useToast();
  const router = useRouter();

  const initial = submission ?? (emptySubmission as Partial<Submission>);
  const [title, setTitle] = useState(initial.title ?? '');
  const [type, setType] = useState<SubmissionType>((initial.type as SubmissionType) ?? 'writing');
  const [genre, setGenre] = useState(initial.genre ?? '');
  const [summary, setSummary] = useState(initial.summary ?? '');
  const [contentWarnings, setContentWarnings] = useState(initial.content_warnings ?? '');
  const [textBody, setTextBody] = useState(initial.text_body ?? '');
  const [artFiles, setArtFiles] = useState<UploadableFile[]>([]);
  const [coverImage, setCoverImage] = useState<UploadableFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (submission?.art_files && Array.isArray(submission.art_files)) {
      setArtFiles(
        (submission.art_files as string[]).map((path) => ({
          id: path,
          name: path.split('/').pop() ?? path,
          size: 0,
          path,
        }))
      );
    }
    if (submission?.cover_image) {
      const name = submission.cover_image.split('/').pop() ?? 'cover';
      setCoverImage({ id: submission.cover_image, name, size: 0, path: submission.cover_image });
    }
  }, [submission]);

  const wordCount = useMemo(() => {
    if (type !== 'writing') return null;
    return textBody
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, [textBody, type]);

  function handleArtFileChange(files: FileList | null) {
    if (!files?.length) return;
    setArtFiles((current) => {
      const accepted = Array.from(files).filter((file) => {
        if (file.size > 25 * 1024 * 1024) {
          notify({
            title: 'File too large',
            description: `${file.name} exceeds the 25MB limit and was skipped.`,
            variant: 'error',
          });
          return false;
        }
        return true;
      });

      if (current.length + accepted.length > 5) {
        notify({
          title: 'Too many files',
          description: 'Please keep visual submissions to five files or fewer.',
          variant: 'error',
        });
        return current;
      }

      return [
        ...current,
        ...accepted.map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          file,
        })),
      ];
    });
  }

  function handleCoverFileChange(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    setCoverImage({ id: crypto.randomUUID(), name: file.name, size: file.size, file });
  }

  function removeArtFile(fileId: string) {
    setArtFiles((current) => current.filter((file) => file.id !== fileId));
  }

  async function uploadFile(ownerId: string, submissionId: string, item: UploadableFile) {
    if (!item.file) {
      return item.path!;
    }

    const path = `${ownerId}/${submissionId}/${Date.now()}-${item.file.name}`;
    const { error } = await supabase.storage.from(ART_BUCKET).upload(path, item.file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      throw error;
    }

    return path;
  }

  async function removeFile(path: string) {
    await supabase.storage.from(ART_BUCKET).remove([path]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You must be signed in to submit.');
      }

      const submissionId = submission?.id ?? crypto.randomUUID();

      const uploadedArtFiles: string[] = [];
      for (const file of artFiles) {
        const path = await uploadFile(user.id, submissionId, file);
        uploadedArtFiles.push(path);
      }

      let coverPath: string | null = null;
      if (coverImage) {
        coverPath = await uploadFile(user.id, submissionId, coverImage);
      }

      const existingPaths = mode === 'edit' ? ((submission?.art_files as string[]) ?? []) : [];
      const removedArtPaths = mode === 'edit' ? existingPaths.filter((path) => !uploadedArtFiles.includes(path)) : [];
      const coverToRemove =
        mode === 'edit' && submission?.cover_image && coverPath !== submission.cover_image
          ? submission.cover_image
          : null;

      const payload = {
        id: submissionId,
        title,
        type,
        genre,
        summary,
        contentWarnings,
        wordCount: wordCount ?? null,
        textBody: type === 'writing' ? textBody : null,
        artFiles: uploadedArtFiles,
        coverImage: coverPath,
      };

      const endpoint = mode === 'create' ? '/api/submissions' : `/api/submissions/${submissionId}`;
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? 'Something went wrong.');
      }

      if (removedArtPaths.length > 0) {
        await removeFileBatch(removedArtPaths);
      }

      if (coverToRemove) {
        await removeFile(coverToRemove);
      }

      notify({
        title: 'Submission saved',
        description: mode === 'create' ? 'Thanks for sharing your work!' : 'Updates saved successfully.',
        variant: 'success',
      });

      onSuccess?.(submissionId);
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save submission.';
      notify({ title: 'Submission failed', description: message, variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeFileBatch(paths: string[]) {
    if (paths.length === 0) return;
    await supabase.storage.from(ART_BUCKET).remove(paths);
  }

  const canSubmit = title.trim().length > 3 && (type === 'visual' ? artFiles.length > 0 : textBody.trim().length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="type">Submission type</Label>
          <Select id="type" name="type" value={type} onChange={(event) => setType(event.target.value as SubmissionType)}>
            {SUBMISSION_TYPES.map((option) => (
              <option key={option} value={option}>
                {option === 'writing' ? 'Writing' : 'Visual art'}
              </option>
            ))}
          </Select>
          <p className="text-xs text-white/50">
            Writing pieces accept pasted text. Visual work accepts JPG, PNG, PDF, or ZIP attachments up to 25MB each.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="genre">Genre (optional)</Label>
          <Input id="genre" name="genre" value={genre} onChange={(event) => setGenre(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            name="summary"
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Give readers a quick description."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="content-warnings">Content warnings</Label>
          <Textarea
            id="content-warnings"
            name="contentWarnings"
            rows={2}
            value={contentWarnings}
            onChange={(event) => setContentWarnings(event.target.value)}
            placeholder="List any sensitive themes so readers can prepare."
          />
        </div>
      </section>

      {type === 'writing' ? (
        <section className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
          <Label htmlFor="text-body">Manuscript</Label>
          <Textarea
            id="text-body"
            name="textBody"
            rows={16}
            value={textBody}
            onChange={(event) => setTextBody(event.target.value)}
            placeholder="Paste your story or poem here."
          />
          <p className="text-xs text-white/50">Word count: {wordCount ?? 0}</p>
        </section>
      ) : (
        <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
          <div className="grid gap-2">
            <Label>Cover image (optional)</Label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleCoverFileChange(event.target.files)}
              className="text-sm text-white/80"
            />
            {coverImage ? (
              <p className="text-xs text-white/60">
                Selected: {coverImage.name}{' '}
                <button type="button" className="underline" onClick={() => setCoverImage(null)}>
                  remove
                </button>
              </p>
            ) : (
              <p className="text-xs text-white/50">Square images look best. JPEG or PNG up to 10MB.</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Artwork files</Label>
            <div className="rounded-lg border border-dashed border-white/20 bg-slate-900/50 p-6 text-center text-sm text-white/60">
              <p className="font-medium">Drag and drop files here or</p>
              <label className="mt-2 inline-block cursor-pointer rounded-md border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:border-white/60">
                Browse
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,application/zip"
                  className="sr-only"
                  onChange={(event) => handleArtFileChange(event.target.files)}
                />
              </label>
              <p className="mt-2 text-xs text-white/40">Max 5 uploads per submission. Individual files up to 25MB.</p>
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              {artFiles.map((file) => (
                <li key={file.id} className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2">
                  <div>
                    <p className="font-medium">{file.name}</p>
                    {file.size > 0 ? <p className="text-xs text-white/50">{formatFileSize(file.size)}</p> : null}
                  </div>
                  <button type="button" className="text-xs uppercase tracking-wide text-rose-200 hover:underline" onClick={() => removeArtFile(file.id)}>
                    Remove
                  </button>
                </li>
              ))}
              {artFiles.length === 0 ? <li className="text-xs text-white/50">No files selected yet.</li> : null}
            </ul>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">Limit 5 submissions per hour. Save drafts while status is Submitted or Needs Revision.</p>
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? 'Saving…' : mode === 'create' ? 'Submit to Chicken Scratch' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function formatFileSize(size: number) {
  if (!size) return '';
  const units = ['B', 'KB', 'MB'];
  let unitIndex = 0;
  let value = size;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
