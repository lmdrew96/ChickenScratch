import type { CSSProperties } from 'react';

export type ImageTransform = {
  rotation?: 0 | 90 | 180 | 270;
  crop?: {
    top: number;    // 0–50  (percentage clipped from each edge)
    right: number;
    bottom: number;
    left: number;
  };
};

export function parseImageTransform(raw: unknown): ImageTransform | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const t = raw as Record<string, unknown>;
  const rotation = ([0, 90, 180, 270] as number[]).includes(Number(t.rotation))
    ? (Number(t.rotation) as 0 | 90 | 180 | 270)
    : 0;
  let crop: ImageTransform['crop'] | undefined;
  if (t.crop && typeof t.crop === 'object' && !Array.isArray(t.crop)) {
    const c = t.crop as Record<string, unknown>;
    crop = {
      top: Number(c.top) || 0,
      right: Number(c.right) || 0,
      bottom: Number(c.bottom) || 0,
      left: Number(c.left) || 0,
    };
  }
  if (!rotation && !crop) return null;
  return { rotation, crop };
}

/** CSS styles to apply: put wrapperStyle on a container div, imgStyle on the <img>. */
export function getImageTransformStyles(t: ImageTransform | null | undefined): {
  wrapperStyle: CSSProperties;
  imgStyle: CSSProperties;
} {
  const wrapperStyle: CSSProperties = {};
  const imgStyle: CSSProperties = {};
  if (!t) return { wrapperStyle, imgStyle };
  if (t.rotation) imgStyle.transform = `rotate(${t.rotation}deg)`;
  if (t.crop) {
    const { top = 0, right = 0, bottom = 0, left = 0 } = t.crop;
    if (top || right || bottom || left) {
      wrapperStyle.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    }
  }
  return { wrapperStyle, imgStyle };
}
