# Image Crop & Rotate Editor

## Overview

Replace the broken CSS-based crop system with a client-side canvas approach using `react-image-crop`. Editors and submission coordinators can rotate and crop submitted images through a draggable frame UI. The processed image is rendered at full resolution on a `<canvas>`, exported as a PNG blob, and uploaded to R2 alongside the preserved original. Display code simply shows the processed image — no client-side transforms needed.

## Requirements

- Draggable crop frame using `react-image-crop`
- Rotation (90-degree increments) combined with crop
- Processed image generated client-side at the original image's natural resolution
- Processed image uploaded to R2 as PNG (no quality loss)
- Original image preserved in R2 for undo/redo
- Available to editors and submission coordinators (existing access controls)

## Data Model

The `ImageTransform` type changes from rotation metadata to file pointers:

```typescript
type ImageTransform = {
  processedPath?: string;  // R2 path to cropped/rotated image
  originalPath?: string;   // R2 path to the original image (for revert)
};
```

Rotation and crop values are not stored — they are baked into the processed image. When `processedPath` exists, display code uses it. Otherwise, the original `art_files` path is used.

The `parseImageTransform` function extracts `processedPath` and `originalPath` strings. The `rotation` field is removed.

## Image Editor Component

File: `src/components/committee/visual/image-editor.tsx`

### Structure

Three parts:

1. **ReactCrop wrapper** — The original image renders inside `<ReactCrop>`. Crop state is stored as `PercentCrop` (resolution-independent). The `ruleOfThirds` prop shows compositional guides.

2. **Rotation controls** — Rotate left (-90), rotate right (+90), reset. Rotation is applied as a CSS transform on the image inside the ReactCrop container so the user crops against the rotated view.

3. **Save flow** — On save:
   - A `<canvas>` is created at the natural resolution of the cropped region
   - Rotation is applied via canvas context transforms (`translate` + `rotate`)
   - The crop region is extracted by scaling `PercentCrop` values to natural pixels
   - `canvas.toBlob('image/png', 1.0)` produces the output
   - The blob is uploaded as `FormData` to `PATCH /api/submissions/[id]/image-transform`
   - On success, a preview of the processed image replaces the editor view

### Rotation + Crop Interaction

When rotation is 90 or 270 degrees, the image's visual width/height swap. The canvas generation accounts for this:

- For 0/180: canvas size = `cropW x cropH` in natural pixels
- For 90/270: the image is drawn rotated, then the crop region is extracted from the rotated result

The key operation: draw the full image onto a temporary canvas with rotation applied, then copy the crop rectangle from that canvas onto the final output canvas.

### Revert

A "Revert to original" button sends `DELETE /api/submissions/[id]/image-transform`, which clears `processedPath`. The editor reloads with the original image. The processed file stays in R2 (no deletion needed; R2 lifecycle rules can clean up orphans if desired).

### Props

```typescript
type Props = {
  submissionId: string;
  imageUrl: string;                    // signed URL for the current image
  originalImageUrl?: string;           // signed URL for the original (if processed exists)
  initialTransform: ImageTransform | null;
  onSave: (transform: ImageTransform) => void;
};
```

## API Route

File: `src/app/api/submissions/[id]/image-transform/route.ts`

### PATCH (save processed image)

- Accepts `multipart/form-data` with:
  - `file`: the processed image blob (PNG)
  - `originalPath`: the R2 path of the original image
- Auth: requires officer or committee access (existing guards)
- Uploads blob to R2 at `art/processed/{submissionId}/{timestamp}.png`
- Updates `submissions.image_transform` to `{ processedPath: "art/processed/...", originalPath: "<originalPath>" }`
- Returns `{ success: true, signedUrl: "<signed URL of processed image>" }`

### DELETE (revert to original)

- No body required
- Auth: same guards
- Sets `submissions.image_transform` to `null`
- Returns `{ success: true }`

## Display Changes

All display locations switch from CSS rotation transforms to using the processed image URL directly.

The pattern at each display site:

1. If `image_transform.processedPath` exists, generate a signed URL for it and use that
2. Otherwise, use the original `art_files` / `cover_image` signed URL
3. No CSS transforms applied in either case — the image displays as-is

### Files affected

| File | Change |
|------|--------|
| `src/types/image-transform.ts` | New type, remove rotation |
| `src/components/committee/visual/image-editor.tsx` | Rebuild with ReactCrop + canvas + upload |
| `src/app/api/submissions/[id]/image-transform/route.ts` | Multipart upload + DELETE handler |
| `src/app/published/[id]/page.tsx` | Use processedPath signed URL, remove CSS transforms |
| `src/components/gallery/published-gallery-client.tsx` | Use processedPath signed URL, remove CSS transforms |
| `src/components/committee/inbox/committee-inbox.tsx` | Use processedPath signed URL, remove CSS transforms |
| `src/components/editor/editor-dashboard.tsx` | Use processedPath signed URL, remove CSS transforms |
| `src/app/published/page.tsx` | Pass processedPath through to client |
| `src/types/database.ts` | Minor type updates |

## Dependencies

- `react-image-crop` (new install)
- Existing: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `zod`, `drizzle-orm`

## Out of Scope

- Aspect ratio locking (free-form crop only)
- Server-side image processing
- Automatic R2 cleanup of orphaned processed images
- Batch editing across multiple art files (editor handles first/only art file)
