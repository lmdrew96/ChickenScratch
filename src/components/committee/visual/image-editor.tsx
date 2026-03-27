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

function rotateImageToDataUrl(img: HTMLImageElement, rotation: Rotation): string {
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const isTransposed = rotation === 90 || rotation === 270;
  const canvasW = isTransposed ? natH : natW;
  const canvasH = isTransposed ? natW : natH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  ctx.save();
  switch (rotation) {
    case 90:
      ctx.translate(canvasW, 0);
      ctx.rotate((Math.PI / 180) * 90);
      break;
    case 180:
      ctx.translate(canvasW, canvasH);
      ctx.rotate((Math.PI / 180) * 180);
      break;
    case 270:
      ctx.translate(0, canvasH);
      ctx.rotate((Math.PI / 180) * 270);
      break;
  }
  ctx.drawImage(img, 0, 0, natW, natH);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function generateProcessedBlob(
  img: HTMLImageElement,
  crop: PercentCrop
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    const cropX = (crop.x / 100) * natW;
    const cropY = (crop.y / 100) * natH;
    const cropW = (crop.width / 100) * natW;
    const cropH = (crop.height / 100) * natH;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.round(cropW);
    outCanvas.height = Math.round(cropH);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return reject(new Error('Canvas not supported'));

    outCtx.drawImage(
      img,
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
  const [rotatedSrc, setRotatedSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceImgRef = useRef<HTMLImageElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);

  const hasProcessed = Boolean(initialTransform?.processedPath);
  const originalPath = initialTransform?.originalPath;

  // When the source image changes, reset editor state
  useEffect(() => {
    setRotation(0);
    setRotatedSrc(null);
    setCrop(DEFAULT_CROP);
    setSaved(false);
    setError(null);
  }, [imageUrl]);

  // Re-render rotated canvas whenever rotation changes and source image is loaded
  const applyRotation = useCallback((rot: Rotation) => {
    const img = sourceImgRef.current;
    if (!img || !img.complete || !img.naturalWidth) return;
    if (rot === 0) {
      setRotatedSrc(null);
    } else {
      setRotatedSrc(rotateImageToDataUrl(img, rot));
    }
    setCrop(DEFAULT_CROP);
    setSaved(false);
  }, []);

  function rotateLeft() {
    const next = ((rotation - 90 + 360) % 360) as Rotation;
    setRotation(next);
    applyRotation(next);
  }

  function rotateRight() {
    const next = ((rotation + 90) % 360) as Rotation;
    setRotation(next);
    applyRotation(next);
  }

  const onSourceLoad = useCallback(() => {
    if (rotation !== 0) {
      applyRotation(rotation);
    } else {
      setCrop(DEFAULT_CROP);
    }
  }, [rotation, applyRotation]);

  async function handleSave() {
    const img = cropImgRef.current;
    if (!img) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const artOriginalPath = originalPath ?? '';
      if (!artOriginalPath) {
        setError('Cannot determine original image path.');
        return;
      }

      // Step 1: get a presigned PUT URL for the processed image
      const urlRes = await fetch(`/api/submissions/${submissionId}/image-transform`);
      if (!urlRes.ok) {
        setError('Failed to prepare upload.');
        return;
      }
      const { uploadUrl, processedPath } = (await urlRes.json()) as { uploadUrl: string; processedPath: string };

      // Step 2: generate the processed blob and upload directly to R2
      const blob = await generateProcessedBlob(img, crop);
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/png' },
      });
      if (!putRes.ok) {
        setError('Upload failed.');
        return;
      }

      // Step 3: record the processed path in the database
      const res = await fetch(`/api/submissions/${submissionId}/image-transform`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processedPath, originalPath: artOriginalPath }),
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

  const editSrc = hasProcessed && originalImageUrl ? originalImageUrl : imageUrl;
  const displaySrc = rotatedSrc ?? editSrc;

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Hidden source image used for rotation canvas operations */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={sourceImgRef}
        src={editSrc}
        alt=""
        crossOrigin="anonymous"
        onLoad={onSourceLoad}
        className="hidden"
        draggable={false}
      />

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
            ref={cropImgRef}
            src={displaySrc}
            alt="Edit"
            crossOrigin="anonymous"
            className="max-h-[420px] w-auto"
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