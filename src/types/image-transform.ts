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
