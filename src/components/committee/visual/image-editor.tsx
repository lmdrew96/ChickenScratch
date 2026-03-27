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
