# Image Crop & Rotate Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors and submission coordinators crop and rotate submitted images using a draggable frame, producing a full-resolution processed image uploaded to R2.

**Architecture:** Client-side canvas generates the processed image at natural resolution by applying rotation + crop. The blob is uploaded via a multipart API route to R2. The original image is preserved for undo. Display code checks for a processed image path and shows it as a plain `<img>` — no CSS transforms.

**Tech Stack:** react-image-crop, Canvas API, R2 (via existing @aws-sdk/client-s3), Next.js API routes, Zod

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/image-transform.ts` | Modify | New type with `processedPath`/`originalPath`, remove rotation |
| `src/components/committee/visual/image-editor.tsx` | Rewrite | ReactCrop + rotation + canvas generation + upload |
| `src/app/api/submissions/[id]/image-transform/route.ts` | Rewrite | Multipart file upload (PATCH) + revert (DELETE) |
| `src/app/published/[id]/page.tsx` | Modify | Use processedPath signed URL, remove CSS transforms |
| `src/app/published/page.tsx` | Modify | Resolve processedPath signed URL |
| `src/components/gallery/published-gallery-client.tsx` | Modify | Use processedPath signed URL, remove CSS transforms |
| `src/components/committee/inbox/committee-inbox.tsx` | Modify | Use processedPath signed URL, remove CSS transforms |
| `src/components/editor/editor-dashboard.tsx` | Modify | Use processedPath signed URL, remove CSS transforms |
| `src/types/database.ts` | Modify | Add `image_transform` back to Pick types, update PublishedSubmission |

---

### Task 1: Install react-image-crop and update ImageTransform type

**Files:**
- Modify: `package.json`
- Modify: `src/types/image-transform.ts`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Install react-image-crop**

Run:
```bash
npm install react-image-crop
```

- [ ] **Step 2: Update ImageTransform type**

Replace the contents of `src/types/image-transform.ts` with:

```typescript
export type ImageTransform = {
  processedPath?: string;
  originalPath?: string;
};

export function parseImageTransform(raw: unknown): ImageTransform | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const t = raw as Record<string, unknown>;
  const processedPath = typeof t.processedPath === 'string' ? t.processedPath : undefined;
  const originalPath = typeof t.originalPath === 'string' ? t.originalPath : undefined;
  if (!processedPath && !originalPath) return null;
  return { processedPath, originalPath };
}
```

- [ ] **Step 3: Update database types**

In `src/types/database.ts`, add `'image_transform'` back to `PublishedSubmissionRow` Pick:

```typescript
export type PublishedSubmissionRow = Pick<
  Submission,
  | 'id'
  | 'title'
  | 'summary'
  | 'type'
  | 'cover_image'
  | 'published_url'
  | 'issue'
  | 'volume'
  | 'issue_number'
  | 'publish_date'
  | 'art_files'
  | 'image_transform'
  | 'updated_at'
  | 'created_at'
>;

export type PublishedSubmission = Omit<PublishedSubmissionRow, 'art_files' | 'image_transform'> & {
  art_files: string[];
  coverSignedUrl: string | null;
  imageTransform: ImageTransform | null;
  processedSignedUrl: string | null;
};
```

- [ ] **Step 4: Verify types compile**

Run:
```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: Type errors in files that still reference `rotation` — these are expected and will be fixed in later tasks.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/types/image-transform.ts src/types/database.ts
git commit -m "feat: install react-image-crop and update ImageTransform type to use processedPath"
```

---

### Task 2: Rewrite API route for file upload and revert

**Files:**
- Rewrite: `src/app/api/submissions/[id]/image-transform/route.ts`

- [ ] **Step 1: Rewrite the API route**

Replace the contents of `src/app/api/submissions/[id]/image-transform/route.ts` with:

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { uploadFile, createSignedUrl } from '@/lib/storage';

async function authorize() {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await ensureProfile(userId);
  if (!profile) return null;

  const database = db();
  const roleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const roleData = roleRows[0];
  if (!roleData?.is_member) return null;

  const positions = roleData.positions ?? [];
  const roles = roleData.roles ?? [];
  if (!hasOfficerAccess(positions, roles) && !hasCommitteeAccess(positions, roles)) return null;

  return { database, profile };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authResult = await authorize();
  if (!authResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { database } = authResult;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });

  const file = formData.get('file');
  const originalPath = formData.get('originalPath');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }
  if (typeof originalPath !== 'string' || !originalPath) {
    return NextResponse.json({ error: 'Missing originalPath.' }, { status: 400 });
  }

  const timestamp = Date.now();
  const processedPath = `processed/${id}/${timestamp}.png`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await uploadFile('art', processedPath, buffer, {
    contentType: 'image/png',
  });

  if (uploadError) {
    console.error('Failed to upload processed image', uploadError);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }

  const transform = { processedPath, originalPath };

  await database
    .update(submissions)
    .set({ image_transform: transform })
    .where(eq(submissions.id, id));

  const signedUrl = await createSignedUrl(processedPath);

  return NextResponse.json({ success: true, signedUrl, transform });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authResult = await authorize();
  if (!authResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { database } = authResult;

  await database
    .update(submissions)
    .set({ image_transform: null })
    .where(eq(submissions.id, id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "image-transform/route"
```

Expected: No errors for this file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/submissions/[id]/image-transform/route.ts
git commit -m "feat: rewrite image-transform API for file upload and revert"
```

---

### Task 3: Rebuild ImageEditor component with ReactCrop

**Files:**
- Rewrite: `src/components/committee/visual/image-editor.tsx`

- [ ] **Step 1: Rewrite the ImageEditor component**

Replace the contents of `src/components/committee/visual/image-editor.tsx` with:

```tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import type { ImageTransform } from '@/types/image-transform';

type Props = {
  submissionId: string;
  imageUrl: string;
  originalImageUrl?: string;
  initialTransform: ImageTransform | null;
  onSave: (transform: ImageTransform) => void;
};

type Rotation = 0 | 90 | 180 | 270;

const DEFAULT_CROP: PercentCrop = { unit: '%', x: 10, y: 10, width: 80, height: 80 };

function generateProcessedBlob(
  img: HTMLImageElement,
  crop: PercentCrop,
  rotation: Rotation
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    // Step 1: draw the full image rotated onto a temporary canvas
    const isTransposed = rotation === 90 || rotation === 270;
    const rotatedW = isTransposed ? natH : natW;
    const rotatedH = isTransposed ? natW : natH;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rotatedW;
    tempCanvas.height = rotatedH;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return reject(new Error('Canvas not supported'));

    tempCtx.save();
    switch (rotation) {
      case 90:
        tempCtx.translate(rotatedW, 0);
        tempCtx.rotate((Math.PI / 180) * 90);
        break;
      case 180:
        tempCtx.translate(rotatedW, rotatedH);
        tempCtx.rotate((Math.PI / 180) * 180);
        break;
      case 270:
        tempCtx.translate(0, rotatedH);
        tempCtx.rotate((Math.PI / 180) * 270);
        break;
    }
    tempCtx.drawImage(img, 0, 0, natW, natH);
    tempCtx.restore();

    // Step 2: extract the crop region from the rotated canvas
    const cropX = (crop.x / 100) * rotatedW;
    const cropY = (crop.y / 100) * rotatedH;
    const cropW = (crop.width / 100) * rotatedW;
    const cropH = (crop.height / 100) * rotatedH;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.round(cropW);
    outCanvas.height = Math.round(cropH);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return reject(new Error('Canvas not supported'));

    outCtx.drawImage(
      tempCanvas,
      Math.round(cropX), Math.round(cropY), Math.round(cropW), Math.round(cropH),
      0, 0, outCanvas.width, outCanvas.height
    );

    outCanvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to generate image'));
        resolve(blob);
      },
      'image/png',
      1.0
    );
  });
}

export function ImageEditor({
  submissionId,
  imageUrl,
  originalImageUrl,
  initialTransform,
  onSave,
}: Props) {
  const [rotation, setRotation] = useState<Rotation>(0);
  const [crop, setCrop] = useState<PercentCrop>(DEFAULT_CROP);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const hasProcessed = Boolean(initialTransform?.processedPath);
  const originalPath = initialTransform?.originalPath;

  // When the source image changes (e.g. after save/revert), reset editor state
  useEffect(() => {
    setRotation(0);
    setCrop(DEFAULT_CROP);
    setSaved(false);
    setError(null);
  }, [imageUrl]);

  const onImageLoad = useCallback(() => {
    // Reset crop when a new image loads
    setCrop(DEFAULT_CROP);
  }, []);

  function rotateLeft() {
    setRotation((r) => ((r - 90 + 360) % 360) as Rotation);
    setSaved(false);
  }

  function rotateRight() {
    setRotation((r) => ((r + 90) % 360) as Rotation);
    setSaved(false);
  }

  async function handleSave() {
    const img = imgRef.current;
    if (!img) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const blob = await generateProcessedBlob(img, crop, rotation);

      // Determine the original path: if we already have one from a previous edit, keep it.
      // Otherwise use the first art_files path, which the parent passes as imageUrl's source path.
      // The parent must provide this via the originalImageUrl prop or we derive it from the current state.
      const artOriginalPath = originalPath ?? '';
      if (!artOriginalPath) {
        setError('Cannot determine original image path.');
        return;
      }

      const formData = new FormData();
      formData.append('file', blob, 'processed.png');
      formData.append('originalPath', artOriginalPath);

      const res = await fetch(`/api/submissions/${submissionId}/image-transform`, {
        method: 'PATCH',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as { error?: string } | null)?.error ?? 'Save failed.');
        return;
      }

      const data = (await res.json()) as { transform: ImageTransform };
      setSaved(true);
      onSave(data.transform);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevert() {
    setReverting(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/image-transform`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setError('Revert failed.');
        return;
      }
      onSave({} as ImageTransform);
    } catch {
      setError('Revert failed.');
    } finally {
      setReverting(false);
    }
  }

  // The image displayed in the crop UI. If a processed version exists and we have
  // the original URL, show the original so the user can re-edit from scratch.
  // Otherwise show whatever imageUrl was passed.
  const editSrc = hasProcessed && originalImageUrl ? originalImageUrl : imageUrl;

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Edit image
        </p>
        {hasProcessed && (
          <button
            type="button"
            onClick={handleRevert}
            disabled={reverting}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            <Undo2 className="h-3 w-3" />
            {reverting ? 'Reverting…' : 'Revert to original'}
          </button>
        )}
      </div>

      {/* Crop area */}
      <div className="flex justify-center rounded-lg bg-black/30 p-2">
        <ReactCrop
          crop={crop}
          onChange={(_, pc) => {
            setCrop(pc);
            setSaved(false);
          }}
          ruleOfThirds
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={editSrc}
            alt="Edit"
            crossOrigin="anonymous"
            onLoad={onImageLoad}
            className="max-h-[420px] w-auto"
            style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
            draggable={false}
          />
        </ReactCrop>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-white/60">Rotation</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={rotateLeft}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> -90
          </button>
          <button
            type="button"
            onClick={rotateRight}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            <RotateCw className="h-3.5 w-3.5" /> +90
          </button>
          <span className="ml-auto text-xs text-white/40">{rotation}°</span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {saving ? 'Processing & uploading…' : saved ? 'Saved ✓' : 'Save changes'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile for this file**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "image-editor"
```

Expected: No errors for this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/committee/visual/image-editor.tsx
git commit -m "feat: rebuild ImageEditor with react-image-crop and canvas processing"
```

---

### Task 4: Update committee inbox to use processed images

**Files:**
- Modify: `src/components/committee/inbox/committee-inbox.tsx`

- [ ] **Step 1: Update the art display and ImageEditor usage**

In `src/components/committee/inbox/committee-inbox.tsx`:

**1a.** Add `getSignedDownloadUrl` usage for original URL. Find the `useEffect` that sets `artSignedUrl` (around line 104-112). Replace it with one that also resolves the original URL when a processed path exists:

Find:
```tsx
  const [artSignedUrl, setArtSignedUrl] = useState<string | null>(null);
```

Replace with:
```tsx
  const [artSignedUrl, setArtSignedUrl] = useState<string | null>(null);
  const [originalArtUrl, setOriginalArtUrl] = useState<string | null>(null);
```

Find the `useEffect` that sets `artSignedUrl`:
```tsx
  useEffect(() => {
    setArtSignedUrl(null);
    if (!selected || selected.submission.type !== 'visual') return;
    const s = selected.submission;
    const artFiles = Array.isArray(s.art_files) ? (s.art_files as string[]) : [];
    const path = artFiles[0] ?? s.cover_image ?? null;
    if (!path) return;
    void getSignedDownloadUrl(path).then((r) => setArtSignedUrl(r.signedUrl));
  }, [selected]);
```

Replace with:
```tsx
  useEffect(() => {
    setArtSignedUrl(null);
    setOriginalArtUrl(null);
    if (!selected || selected.submission.type !== 'visual') return;
    const s = selected.submission;
    const t = parseImageTransform(s.image_transform);
    const artFiles = Array.isArray(s.art_files) ? (s.art_files as string[]) : [];
    const originalPath = artFiles[0] ?? s.cover_image ?? null;

    if (t?.processedPath) {
      // Show the processed image, but also resolve the original for re-editing
      void getSignedDownloadUrl(t.processedPath).then((r) => setArtSignedUrl(r.signedUrl));
      if (originalPath) {
        void getSignedDownloadUrl(originalPath).then((r) => setOriginalArtUrl(r.signedUrl));
      }
    } else if (originalPath) {
      void getSignedDownloadUrl(originalPath).then((r) => setArtSignedUrl(r.signedUrl));
    }
  }, [selected]);
```

**1b.** Update the visual art inline display (around line 349-362). Find:
```tsx
              {selected.submission.type === 'visual' && artSignedUrl && (() => {
                const t = parseImageTransform(selected.submission.image_transform);
                return (
                  <div className="flex justify-center rounded-xl border border-white/10 bg-black/20 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artSignedUrl}
                      alt={selected.submission.title}
                      className="block max-h-72 w-auto"
                      style={t?.rotation ? { transform: `rotate(${t.rotation}deg)` } : undefined}
                    />
                  </div>
                );
              })()}
```

Replace with:
```tsx
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
```

**1c.** Update the ImageEditor props (around line 389-398). Find:
```tsx
              {selected.submission.type === 'visual' && artSignedUrl &&
                (userRole === 'submissions_coordinator' || userRole === 'editor_in_chief') && (
                <ImageEditor
                  submissionId={selected.submission.id}
                  imageUrl={artSignedUrl}
                  initialTransform={parseImageTransform(selected.submission.image_transform)}
                  onSave={() => router.refresh()}
                />
              )}
```

Replace with:
```tsx
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
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "committee-inbox"
```

Expected: No errors for this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/committee/inbox/committee-inbox.tsx
git commit -m "feat: update committee inbox to use processed image URLs"
```

---

### Task 5: Update editor dashboard to use processed images

**Files:**
- Modify: `src/components/editor/editor-dashboard.tsx`

- [ ] **Step 1: Update art display and ImageEditor usage**

In `src/components/editor/editor-dashboard.tsx`:

**1a.** Add state for original URLs. Find (around line 104-105):
```tsx
  const [artSignedUrls, setArtSignedUrls] = useState<string[]>([]);
```

Replace with:
```tsx
  const [artSignedUrls, setArtSignedUrls] = useState<string[]>([]);
  const [originalArtUrl, setOriginalArtUrl] = useState<string | null>(null);
```

**1b.** Update the `useEffect` that resolves art URLs. Find (around line 128-134):
```tsx
    setArtSignedUrls([]);
    if (selectedSubmission.type === 'visual' && selectedSubmission.art_files.length > 0) {
      void Promise.all(selectedSubmission.art_files.map((p) => getSignedDownloadUrl(p))).then((results) =>
        setArtSignedUrls(results.map((r) => r.signedUrl ?? ''))
      );
    }
```

Replace with:
```tsx
    setArtSignedUrls([]);
    setOriginalArtUrl(null);
    if (selectedSubmission.type === 'visual' && selectedSubmission.art_files.length > 0) {
      const t = parseImageTransform(selectedSubmission.image_transform);
      if (t?.processedPath) {
        // Show the processed image as the first art URL
        void getSignedDownloadUrl(t.processedPath).then((r) => {
          setArtSignedUrls([r.signedUrl ?? '', ...[]]);
        });
        // Also resolve the original for re-editing
        void getSignedDownloadUrl(selectedSubmission.art_files[0]!).then((r) => {
          setOriginalArtUrl(r.signedUrl);
        });
      } else {
        void Promise.all(selectedSubmission.art_files.map((p) => getSignedDownloadUrl(p))).then((results) =>
          setArtSignedUrls(results.map((r) => r.signedUrl ?? ''))
        );
      }
    }
```

**1c.** Remove the CSS rotation from art display. Find (around line 586-593):
```tsx
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={selectedSubmission.art_files[i]?.split('/').pop() ?? 'Artwork'}
                        className="block max-h-96 w-auto"
                        style={artTransform?.rotation ? { transform: `rotate(${artTransform.rotation}deg)` } : undefined}
                      />
```

Replace with:
```tsx
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={selectedSubmission.art_files[i]?.split('/').pop() ?? 'Artwork'}
                        className="block max-h-96 w-auto"
                      />
```

**1d.** Update the ImageEditor props. Find (around line 616-623):
```tsx
              {artSignedUrls[0] && (
                <ImageEditor
                  submissionId={selectedSubmission.id}
                  imageUrl={artSignedUrls[0]}
                  initialTransform={artTransform}
                  onSave={() => { startTransition(() => { router.refresh(); }); }}
                />
              )}
```

Replace with:
```tsx
              {artSignedUrls[0] && (() => {
                const artOriginalPath = artTransform?.originalPath ?? selectedSubmission.art_files[0] ?? '';
                return (
                  <ImageEditor
                    submissionId={selectedSubmission.id}
                    imageUrl={artSignedUrls[0]!}
                    originalImageUrl={originalArtUrl ?? undefined}
                    initialTransform={artTransform ? { ...artTransform, originalPath: artOriginalPath } : { originalPath: artOriginalPath }}
                    onSave={() => { startTransition(() => { router.refresh(); }); }}
                  />
                );
              })()}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "editor-dashboard"
```

Expected: No errors for this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/editor-dashboard.tsx
git commit -m "feat: update editor dashboard to use processed image URLs"
```

---

### Task 6: Update published pages to use processed images

**Files:**
- Modify: `src/app/published/page.tsx`
- Modify: `src/app/published/[id]/page.tsx`
- Modify: `src/components/gallery/published-gallery-client.tsx`

- [ ] **Step 1: Update the published gallery server page**

In `src/app/published/page.tsx`, update the mapping that builds `publishedSubmissions` (around line 60-67). Find:

```tsx
  const publishedSubmissions: PublishedSubmission[] = await Promise.all(
    rawSubmissions.map(async ({ image_transform, ...submission }) => ({
      ...submission,
      art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
      coverSignedUrl: submission.cover_image ? await createSignedUrl(submission.cover_image) : null,
      imageTransform: parseImageTransform(image_transform),
    }))
  );
```

Replace with:
```tsx
  const publishedSubmissions: PublishedSubmission[] = await Promise.all(
    rawSubmissions.map(async ({ image_transform, ...submission }) => {
      const transform = parseImageTransform(image_transform);
      // If a processed image exists, use it as the cover URL
      const processedSignedUrl = transform?.processedPath
        ? await createSignedUrl(transform.processedPath)
        : null;
      return {
        ...submission,
        art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
        coverSignedUrl: processedSignedUrl ?? (submission.cover_image ? await createSignedUrl(submission.cover_image) : null),
        imageTransform: transform,
        processedSignedUrl,
      };
    })
  );
```

- [ ] **Step 2: Update the published detail page**

In `src/app/published/[id]/page.tsx`:

**2a.** Remove the rotation CSS from the cover image. Find (around line 148-162):
```tsx
      {coverUrl ? (
        <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-white/10">
          <Image
            src={coverUrl}
            alt={submission.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            className="object-cover"
            style={imageTransform?.rotation ? { transform: `rotate(${imageTransform.rotation}deg)` } : undefined}
          />
        </div>
      ) : null}
```

Replace with:
```tsx
      {coverUrl ? (
        <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-white/10">
          <Image
            src={coverUrl}
            alt={submission.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            className="object-cover"
          />
        </div>
      ) : null}
```

**2b.** Update the art file display to prefer the processed image. Find the section that maps `assetEntries` (around line 189-202):
```tsx
          {assetEntries.map(({ path, signedUrl }) => (
            <div key={path} className="space-y-2">
              {signedUrl ? (
                <div className="flex justify-center rounded-xl border border-white/10 overflow-hidden p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signedUrl}
                    alt={path.split('/').pop() ?? submission.title}
                    className="block max-h-[80vh] w-auto"
                    style={imageTransform?.rotation ? { transform: `rotate(${imageTransform.rotation}deg)` } : undefined}
                  />
                </div>
              ) : null}
```

Replace with:
```tsx
          {assetEntries.map(({ path, signedUrl }, index) => {
            // For the first art file, use the processed image if available
            const displayUrl = index === 0 && processedUrl ? processedUrl : signedUrl;
            return (
            <div key={path} className="space-y-2">
              {displayUrl ? (
                <div className="flex justify-center rounded-xl border border-white/10 overflow-hidden p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayUrl}
                    alt={path.split('/').pop() ?? submission.title}
                    className="block max-h-[80vh] w-auto"
                  />
                </div>
              ) : null}
```

Make sure to close the new arrow function — find the closing of the `.map` callback later in the JSX and add the proper closing. The existing code has:
```tsx
            </div>
          ))}
```

Replace with:
```tsx
            </div>
            );
          })}
```

**2c.** Add `processedUrl` resolution near line 113-114. Find:
```tsx
  const assetEntries = await createSignedUrls(artFiles);
  const imageTransform = parseImageTransform(submission.image_transform);
```

Replace with:
```tsx
  const assetEntries = await createSignedUrls(artFiles);
  const imageTransform = parseImageTransform(submission.image_transform);
  const processedUrl = imageTransform?.processedPath
    ? await createSignedUrl(imageTransform.processedPath)
    : null;
```

- [ ] **Step 3: Update the published gallery client**

In `src/components/gallery/published-gallery-client.tsx`:

**3a.** Remove rotation from gallery grid cards. Find (around line 200-209):
```tsx
                      style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
```

Remove that line entirely (the `style` prop on the `<Image>` component).

Also remove the `rotation` variable. Find (around line 188):
```tsx
            const rotation = submission.imageTransform?.rotation;
```

Remove that line.

**3b.** Remove rotation from lightbox. Find (around line 406-412):
```tsx
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.imageUrl}
              alt={lightbox.title}
              className="block max-h-[90vh] max-w-[90vw] w-auto"
              style={lightbox.imageTransform?.rotation ? { transform: `rotate(${lightbox.imageTransform.rotation}deg)` } : undefined}
            />
```

Replace with:
```tsx
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.imageUrl}
              alt={lightbox.title}
              className="block max-h-[90vh] max-w-[90vw] w-auto"
            />
```

**3c.** Clean up unused imports. Remove the `ImageTransform` type import if it becomes unused. Check the `LightboxState` interface — the `imageTransform` field can be removed since it's no longer used for display. Find:
```tsx
import type { ImageTransform } from '@/types/image-transform';
```
and
```tsx
interface LightboxState {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  downloadUrl?: string;
  imageTransform?: ImageTransform | null;
}
```

Replace `LightboxState` with:
```tsx
interface LightboxState {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  downloadUrl?: string;
}
```

Update the `openLightbox` function signature. Find:
```tsx
  const openLightbox = (imageUrl: string, title: string, downloadUrl?: string, imageTransform?: ImageTransform | null) => {
    setLightbox({ isOpen: true, imageUrl, title, downloadUrl, imageTransform });
```

Replace with:
```tsx
  const openLightbox = (imageUrl: string, title: string, downloadUrl?: string) => {
    setLightbox({ isOpen: true, imageUrl, title, downloadUrl });
```

Update the call site. Find:
```tsx
                          onClick={() => openLightbox(submission.coverSignedUrl!, submission.title, submission.coverSignedUrl ?? undefined, submission.imageTransform)}
```

Replace with:
```tsx
                          onClick={() => openLightbox(submission.coverSignedUrl!, submission.title, submission.coverSignedUrl ?? undefined)}
```

Remove the now-unused import:
```tsx
import type { ImageTransform } from '@/types/image-transform';
```

- [ ] **Step 4: Verify types compile across all modified files**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/published/page.tsx src/app/published/[id]/page.tsx src/components/gallery/published-gallery-client.tsx
git commit -m "feat: update published pages to display processed images"
```

---

### Task 7: Final type check, cleanup, and verification

**Files:**
- All modified files

- [ ] **Step 1: Full type check**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Check for stale rotation references**

Run:
```bash
grep -rn "rotation" src/types/image-transform.ts src/components/committee/visual/image-editor.tsx src/app/api/submissions/\[id\]/image-transform/route.ts src/app/published/ src/components/gallery/published-gallery-client.tsx src/components/committee/inbox/committee-inbox.tsx src/components/editor/editor-dashboard.tsx
```

Expected: `rotation` should only appear inside `image-editor.tsx` (the local rotation state used during editing). It should NOT appear in display components, the API route, or the type definition.

- [ ] **Step 3: Verify react-image-crop CSS is importable**

Run:
```bash
ls node_modules/react-image-crop/dist/ReactCrop.css
```

Expected: File exists.

- [ ] **Step 4: Run the dev server to verify no runtime errors**

Run:
```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 5: Commit any final fixes**

If any fixes were needed:
```bash
git add -A
git commit -m "fix: final cleanup for image crop and rotate feature"
```
