'use client';

import { useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const RENDER_SCALE = 2.0;
const MAX_PAGE_WIDTH = 420;
const PORTRAIT_BREAKPOINT = 640; // px — below this, switch to single-page mode

type Props = {
  pdfUrl: string;
  title: string;
};

export function PdfFlipbook({ pdfUrl, title }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState(0); // height / width of one PDF page
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Flipbook ref for programmatic page turns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flipBookRef = useRef<any>(null);

  // Responsive layout state — driven by ResizeObserver on the container
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(MAX_PAGE_WIDTH);
  const [isPortrait, setIsPortrait] = useState(false);

  // Measure container and pick portrait vs. landscape + page width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update(containerPx: number) {
      const portrait = containerPx < PORTRAIT_BREAKPOINT;
      setIsPortrait(portrait);
      setPageWidth(
        portrait
          ? Math.floor(containerPx - 16)                              // one page, small inset
          : Math.min(Math.floor((containerPx - 16) / 2), MAX_PAGE_WIDTH) // two pages, max 420 each
      );
    }

    const ro = new ResizeObserver(entries => update(entries[0]!.contentRect.width));
    ro.observe(el);
    update(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Load + render PDF pages
  useEffect(() => {
    let cancelled = false;

    async function renderPages() {
      try {
        const pdf = await pdfjs.getDocument({ url: pdfUrl, withCredentials: false }).promise;

        // Compute aspect ratio from page 1 at natural scale
        const firstPage = await pdf.getPage(1);
        const natural = firstPage.getViewport({ scale: 1 });
        if (!cancelled) setAspectRatio(natural.height / natural.width);

        const rendered: string[] = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelled) return;
          const page = await pdf.getPage(n);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
          rendered.push(canvas.toDataURL('image/jpeg', 0.92));
          page.cleanup();
        }

        if (!cancelled) {
          setPages(rendered);
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[PdfFlipbook]', err);
          setStatus('error');
        }
      }
    }

    setStatus('loading');
    setPages([]);
    setAspectRatio(0);
    void renderPages();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  const displayHeight = aspectRatio > 0 ? Math.round(pageWidth * aspectRatio) : 0;
  const ready = status === 'ready' && displayHeight > 0;

  // Arrow key navigation
  useEffect(() => {
    if (!ready) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') flipBookRef.current?.pageFlip().flipNext();
      if (e.key === 'ArrowLeft')  flipBookRef.current?.pageFlip().flipPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ready]);

  return (
    <div ref={containerRef} className="w-full">
      {status === 'loading' && (
        <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]" />
            <p className="text-sm text-slate-400">Loading flipbook…</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <p className="text-sm text-slate-400">Unable to load this issue.</p>
        </div>
      )}

      {ready && (
        <div
          className="flex justify-center rounded-lg"
          role="region"
          aria-label={`Flipbook for ${title}`}
        >
          <HTMLFlipBook
            ref={flipBookRef}
            width={pageWidth}
            height={displayHeight}
            size="fixed"
            minWidth={150}
            maxWidth={MAX_PAGE_WIDTH}
            minHeight={200}
            maxHeight={displayHeight}
            usePortrait={isPortrait}
            showCover={true}
            mobileScrollSupport={true}
            className="shadow-2xl"
            style={{}}
            startPage={0}
            drawShadow={true}
            flippingTime={600}
            startZIndex={0}
            autoSize={false}
            maxShadowOpacity={0.4}
            showPageCorners={true}
            disableFlipByClick={false}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={30}
          >
            {pages.map((src, i) => (
              <div key={i} style={{ width: pageWidth, height: displayHeight }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${title} — page ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
                  draggable={false}
                />
              </div>
            ))}
          </HTMLFlipBook>
        </div>
      )}
    </div>
  );
}
