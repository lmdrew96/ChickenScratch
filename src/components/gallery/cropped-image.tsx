'use client';

import { useEffect, useState, useRef } from 'react';
import type { ImageTransform } from '@/types/image-transform';

interface Props {
  src: string;
  alt: string;
  crop?: ImageTransform['crop'];
  rotation?: 0 | 90 | 180 | 270;
  /** CSS max-height for the wrapper, e.g. '80vh' or '384px' */
  maxHeight?: string;
  className?: string;
}

export function CroppedImage({ src, alt, crop, rotation = 0, maxHeight, className }: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [hadError, setHadError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function captureNaturalSize(img: HTMLImageElement | null) {
    if (!img) return;
    // Guard: some failure modes report 0x0; don't lock in an unusable size.
    if (!img.naturalWidth || !img.naturalHeight) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }

  function handleLoad() {
    captureNaturalSize(imgRef.current);
  }

  function handleError() {
    setHadError(true);
    // Fall back to non-cropped rendering if the image can't be loaded.
    setNaturalSize(null);
  }

  // If the image is already in cache, onLoad may not fire in time; capture size on mount/src changes.
  useEffect(() => {
    setHadError(false);
    const img = imgRef.current;
    if (img?.complete) captureNaturalSize(img);
  }, [src]);

  const hasCrop = crop && (crop.top || crop.right || crop.bottom || crop.left);

  // Before natural size is known, show image normally with temporary clip-path fallback
  if (!naturalSize || !hasCrop) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className ?? 'block max-h-[80vh] w-auto'}
        style={{
          display: 'block',
          ...(rotation ? { transform: `rotate(${rotation}deg)` } : {}),
          ...(hasCrop && !naturalSize && crop
            ? { clipPath: `inset(${crop.top ?? 0}% ${crop.right ?? 0}% ${crop.bottom ?? 0}% ${crop.left ?? 0}%)` }
            : {}),
        }}
        onLoad={handleLoad}
        onError={handleError}
        // Signed R2 URLs are cross-origin; setting this reduces browser differences and keeps options open.
        crossOrigin="anonymous"
      />
    );
  }

  const { top = 0, right = 0, bottom = 0, left = 0 } = crop!;

  // For 90°/270° rotations, the painted width/height swap
  const isTransposed = rotation === 90 || rotation === 270;
  const paintedW = isTransposed ? naturalSize.h : naturalSize.w;
  const paintedH = isTransposed ? naturalSize.w : naturalSize.h;

  // Crop amounts in natural-image pixels, measured against the painted rect
  const cropTop = (top / 100) * paintedH;
  const cropLeft = (left / 100) * paintedW;
  const visW = paintedW * (1 - (left + right) / 100);
  const visH = paintedH * (1 - (top + bottom) / 100);

  // Compute the CSS transform + position for the img element
  // We render the image at natural size, apply rotation, then offset so the
  // cropped region aligns with the top-left of the overflow:hidden wrapper.
  let imgTransform: string;
  let imgTop: number;
  let imgLeft: number;

  switch (rotation) {
    case 90:
      // rotate(90deg) with transform-origin top-left shifts the image right by naturalH
      imgTransform = `translateX(${naturalSize.h}px) rotate(90deg)`;
      imgTop = -cropTop;
      imgLeft = -cropLeft;
      break;
    case 180:
      imgTransform = `translate(${naturalSize.w}px, ${naturalSize.h}px) rotate(180deg)`;
      imgTop = -cropTop;
      imgLeft = -cropLeft;
      break;
    case 270:
      imgTransform = `translateY(${naturalSize.w}px) rotate(270deg)`;
      imgTop = -cropTop;
      imgLeft = -cropLeft;
      break;
    default:
      imgTransform = '';
      imgTop = -cropTop;
      imgLeft = -cropLeft;
      break;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: visW,
        height: visH,
        overflow: 'hidden',
        ...(maxHeight ? { maxHeight, aspectRatio: `${visW} / ${visH}` } : {}),
      }}
      className={className}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          top: imgTop,
          left: imgLeft,
          width: naturalSize.w,
          height: naturalSize.h,
          display: 'block',
          transformOrigin: 'top left',
          ...(imgTransform ? { transform: imgTransform } : {}),
          ...(hadError ? { display: 'none' } : {}),
        }}
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
      />
    </div>
  );
}
