'use client';

import { useState } from 'react';
import { RotateCcw, RotateCw, Crop, RotateCcw as Reset } from 'lucide-react';
import type { ImageTransform } from '@/types/image-transform';
import { getImageTransformStyles } from '@/types/image-transform';

type Props = {
  submissionId: string;
  imageUrl: string;
  initialTransform: ImageTransform | null;
  onSave: (transform: ImageTransform) => void;
};

const DEFAULT_CROP = { top: 0, right: 0, bottom: 0, left: 0 };

export function ImageEditor({ submissionId, imageUrl, initialTransform, onSave }: Props) {
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(initialTransform?.rotation ?? 0);
  const [crop, setCrop] = useState(initialTransform?.crop ?? DEFAULT_CROP);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { wrapperStyle, imgStyle } = getImageTransformStyles({ rotation, crop });

  function rotateLeft() {
    setRotation((r) => ((r - 90 + 360) % 360) as 0 | 90 | 180 | 270);
    setSaved(false);
  }
  function rotateRight() {
    setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270);
    setSaved(false);
  }
  function resetAll() {
    setRotation(0);
    setCrop(DEFAULT_CROP);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const transform: ImageTransform = { rotation, crop };
      const res = await fetch(`/api/submissions/${submissionId}/image-transform`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transform),
      });
      if (res.ok) {
        setSaved(true);
        onSave(transform);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Edit image</p>
        <button
          type="button"
          onClick={resetAll}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
        >
          <Reset className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Live preview */}
      <div className="flex justify-center rounded-lg bg-black/30">
        <div className="overflow-hidden" style={{ width: 'fit-content', ...wrapperStyle }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Preview"
            className="block max-h-64 w-auto"
            style={imgStyle}
          />
        </div>
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
            <RotateCcw className="h-3.5 w-3.5" /> −90°
          </button>
          <button
            type="button"
            onClick={rotateRight}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            <RotateCw className="h-3.5 w-3.5" /> +90°
          </button>
          <span className="ml-auto text-xs text-white/40">{rotation}°</span>
        </div>
      </div>

      {/* Crop */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-white/60">
          <Crop className="h-3.5 w-3.5" /> Crop (% from each edge)
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <label key={side} className="space-y-0.5">
              <span className="flex justify-between text-xs text-white/40">
                <span className="capitalize">{side}</span>
                <span>{crop[side]}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={crop[side]}
                onChange={(e) => {
                  setCrop((c) => ({ ...c, [side]: Number(e.target.value) }));
                  setSaved(false);
                }}
                className="w-full accent-amber-400"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
      </button>
    </div>
  );
}
