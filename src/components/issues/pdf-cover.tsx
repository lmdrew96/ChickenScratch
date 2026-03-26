'use client';

import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  pdfUrl: string;
  title: string;
};

export function PdfCover({ pdfUrl, title }: Props) {
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function renderCover() {
      try {
        const pdf = await pdfjs.getDocument({ url: pdfUrl, withCredentials: false }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setCoverSrc(canvas.toDataURL('image/jpeg', 0.92));
          setStatus('ready');
        }
        page.cleanup();
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    void renderCover();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  if (status === 'loading') {
    return <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-white/10" />;
  }

  if (status === 'error' || !coverSrc) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-white/5 text-xs text-slate-500">
        No preview
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverSrc}
      alt={`Cover of ${title}`}
      className="w-full rounded-lg shadow-md"
      draggable={false}
    />
  );
}
