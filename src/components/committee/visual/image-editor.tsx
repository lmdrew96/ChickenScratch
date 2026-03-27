'use client';

import { useState, useRef, useEffect } from 'react';
import { RotateCcw, RotateCw, RotateCcw as Reset } from 'lucide-react';
import type { ImageTransform } from '@/types/image-transform';
import { CroppedImage } from '@/components/gallery/cropped-image';

type Props = {
  submissionId: string;
  imageUrl: string;
  initialTransform: ImageTransform | null;
  onSave: (transform: ImageTransform) => void;
};

// CropBox tracks the visible region as fractions of the image (0–1)
type CropBox = { x: number; y: number; w: number; h: number };
type HandleType = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const MIN_SIZE = 0.05;

function transformToCropBox(crop?: ImageTransform['crop']): CropBox {
  if (!crop) return { x: 0, y: 0, w: 1, h: 1 };
  const x = (crop.left ?? 0) / 100;
  const y = (crop.top ?? 0) / 100;
  const w = 1 - (crop.left ?? 0) / 100 - (crop.right ?? 0) / 100;
  const h = 1 - (crop.top ?? 0) / 100 - (crop.bottom ?? 0) / 100;
  return { x, y, w: Math.max(MIN_SIZE, w), h: Math.max(MIN_SIZE, h) };
}

function cropBoxToTransform(box: CropBox): ImageTransform['crop'] {
  return {
    left:   Math.round(box.x * 100),
    top:    Math.round(box.y * 100),
    right:  Math.round((1 - box.x - box.w) * 100),
    bottom: Math.round((1 - box.y - box.h) * 100),
  };
}

function clampBox(box: CropBox): CropBox {
  let { x, y, w, h } = box;
  w = Math.max(MIN_SIZE, w);
  h = Math.max(MIN_SIZE, h);
  x = Math.max(0, Math.min(x, 1 - w));
  y = Math.max(0, Math.min(y, 1 - h));
  w = Math.min(w, 1 - x);
  h = Math.min(h, 1 - y);
  return { x, y, w, h };
}

function getCursor(handle: HandleType | null): string {
  switch (handle) {
    case 'move': return 'move';
    case 'nw': case 'se': return 'nwse-resize';
    case 'ne': case 'sw': return 'nesw-resize';
    case 'n':  case 's':  return 'ns-resize';
    case 'e':  case 'w':  return 'ew-resize';
    default: return 'crosshair';
  }
}

const HANDLE_DEFS: { id: HandleType; top?: number | string; bottom?: number | string; left?: number | string; right?: number | string }[] = [
  { id: 'nw', top: -5, left: -5 },
  { id: 'n',  top: -5, left: 'calc(50% - 5px)' },
  { id: 'ne', top: -5, right: -5 },
  { id: 'e',  top: 'calc(50% - 5px)', right: -5 },
  { id: 'se', bottom: -5, right: -5 },
  { id: 's',  bottom: -5, left: 'calc(50% - 5px)' },
  { id: 'sw', bottom: -5, left: -5 },
  { id: 'w',  top: 'calc(50% - 5px)', left: -5 },
];

export function ImageEditor({ submissionId, imageUrl, initialTransform, onSave }: Props) {
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(initialTransform?.rotation ?? 0);
  const [cropBox, setCropBox] = useState<CropBox>(() => transformToCropBox(initialTransform?.crop));
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: HandleType;
    startX: number;
    startY: number;
    startBox: CropBox;
  } | null>(null);

  useEffect(() => {
    setRotation(initialTransform?.rotation ?? 0);
    setCropBox(transformToCropBox(initialTransform?.crop));
    setSaved(false);
  }, [initialTransform]);

  function getContainerRect() {
    return containerRef.current?.getBoundingClientRect() ?? null;
  }

  function detectHandle(px: number, py: number, box: CropBox): HandleType | null {
    const HIT = 0.04; // fraction of container
    const handles: { id: HandleType; hx: number; hy: number }[] = [
      { id: 'nw', hx: box.x,               hy: box.y },
      { id: 'n',  hx: box.x + box.w / 2,   hy: box.y },
      { id: 'ne', hx: box.x + box.w,        hy: box.y },
      { id: 'e',  hx: box.x + box.w,        hy: box.y + box.h / 2 },
      { id: 'se', hx: box.x + box.w,        hy: box.y + box.h },
      { id: 's',  hx: box.x + box.w / 2,   hy: box.y + box.h },
      { id: 'sw', hx: box.x,               hy: box.y + box.h },
      { id: 'w',  hx: box.x,               hy: box.y + box.h / 2 },
    ];
    for (const h of handles) {
      if (Math.abs(px - h.hx) < HIT && Math.abs(py - h.hy) < HIT) return h.id;
    }
    if (px > box.x && px < box.x + box.w && py > box.y && py < box.y + box.h) return 'move';
    return null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = getContainerRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const handle = detectHandle(px, py, cropBox);
    if (!handle) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, startBox: { ...cropBox } };
    setIsDragging(true);
    setSaved(false);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = getContainerRect();
    if (!rect) return;

    if (!dragRef.current) {
      // Update hover cursor
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      setHoveredHandle(detectHandle(px, py, cropBox));
      return;
    }

    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const { handle, startBox: s } = dragRef.current;

    let newBox: CropBox;
    switch (handle) {
      case 'move': newBox = { x: s.x + dx, y: s.y + dy, w: s.w, h: s.h }; break;
      case 'nw':   newBox = { x: s.x + dx, y: s.y + dy, w: s.w - dx, h: s.h - dy }; break;
      case 'n':    newBox = { x: s.x,       y: s.y + dy, w: s.w,       h: s.h - dy }; break;
      case 'ne':   newBox = { x: s.x,       y: s.y + dy, w: s.w + dx,  h: s.h - dy }; break;
      case 'e':    newBox = { x: s.x,       y: s.y,       w: s.w + dx,  h: s.h }; break;
      case 'se':   newBox = { x: s.x,       y: s.y,       w: s.w + dx,  h: s.h + dy }; break;
      case 's':    newBox = { x: s.x,       y: s.y,       w: s.w,       h: s.h + dy }; break;
      case 'sw':   newBox = { x: s.x + dx, y: s.y,       w: s.w - dx,  h: s.h + dy }; break;
      case 'w':    newBox = { x: s.x + dx, y: s.y,       w: s.w - dx,  h: s.h }; break;
    }
    setCropBox(clampBox(newBox));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
    setIsDragging(false);
  }

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
    setCropBox({ x: 0, y: 0, w: 1, h: 1 });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const transform: ImageTransform = { rotation, crop: cropBoxToTransform(cropBox) };
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

  const { x, y, w, h } = cropBox;
  const previewCrop = cropBoxToTransform(cropBox);

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

      {/* Crop frame UI */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-lg bg-black/30"
        style={{ cursor: getCursor(isDragging ? (dragRef.current?.handle ?? null) : hoveredHandle) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Preview"
          className="mx-auto block max-h-[420px] w-auto"
          style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
          draggable={false}
        />

        {/* Crop overlay (pointer-events-none — all interaction is on the container) */}
        <div className="pointer-events-none absolute inset-0">
          <div
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
              border: '1.5px solid white',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            }}
          >
            {/* Rule-of-thirds grid, visible while dragging */}
            {isDragging && (
              <>
                <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
              </>
            )}

            {/* 8 resize handles */}
            {HANDLE_DEFS.map(({ id, ...pos }) => (
              <div
                key={id}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.4)',
                  borderRadius: 2,
                  ...pos,
                }}
              />
            ))}
          </div>
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

      {/* Live preview of the crop result */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-white/60">Preview</p>
        <div className="flex justify-center rounded-lg bg-black/30 p-2">
          <CroppedImage
            src={imageUrl}
            alt="Crop preview"
            crop={previewCrop}
            rotation={rotation}
            maxHeight="200px"
          />
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
