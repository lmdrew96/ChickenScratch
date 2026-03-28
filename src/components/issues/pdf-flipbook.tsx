'use client';

import { useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const RENDER_SCALE = 3.5;
const PORTRAIT_BREAKPOINT = 640;  // px — below this, single-page mode
const TABLET_BREAKPOINT   = 1024; // px

const ZOOM_STEP = 0.25;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 3.0;

type Props = {
  pdfUrl: string;
  title: string;
};

export function PdfFlipbook({ pdfUrl, title }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panOrigin = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [pageWidth, setPageWidth] = useState(460);
  const [isPortrait, setIsPortrait] = useState(false);

  // Measure container and pick portrait vs. landscape + page width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update(containerPx: number) {
      const portrait = containerPx < PORTRAIT_BREAKPOINT;
      setIsPortrait(portrait);
      if (portrait) {
        setPageWidth(Math.floor(containerPx - 16));
      } else if (containerPx < TABLET_BREAKPOINT) {
        setPageWidth(Math.min(Math.floor((containerPx - 24) / 2), 460));
      } else {
        setPageWidth(Math.min(Math.floor((containerPx - 24) / 2), 520));
      }
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
          rendered.push(canvas.toDataURL('image/jpeg', 0.95));
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
  const isZoomed = zoom > 1;

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

  // Reset pan when returning to 1×
  useEffect(() => {
    if (!isZoomed) { setPanX(0); setPanY(0); }
  }, [isZoomed]);

  function zoomOut() { setZoom(z => parseFloat(Math.max(ZOOM_MIN, z - ZOOM_STEP).toFixed(2))); }
  function zoomIn()  { setZoom(z => parseFloat(Math.min(ZOOM_MAX, z + ZOOM_STEP).toFixed(2))); }

  // Panning — pointer events so mouse + touch both work.
  // Translate is in the inner (pre-scale) CSS space, so divide screen delta by zoom
  // to keep the feel 1:1 with finger/cursor movement on screen.
  function handlePanStart(e: React.PointerEvent) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    panOrigin.current = { px: e.clientX, py: e.clientY, ox: panX, oy: panY };
  }

  function handlePanMove(e: React.PointerEvent) {
    if (!panOrigin.current) return;
    setPanX(panOrigin.current.ox + (e.clientX - panOrigin.current.px) / zoom);
    setPanY(panOrigin.current.oy + (e.clientY - panOrigin.current.py) / zoom);
  }

  function handlePanEnd() {
    setIsPanning(false);
    panOrigin.current = null;
  }

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
        <>
          {/* Zoom controls */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <button
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-lg leading-none text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="w-14 select-none text-center text-sm tabular-nums text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-lg leading-none text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          {/* Flipbook viewport */}
          <div
            className="flex justify-center overflow-hidden rounded-lg"
            role="region"
            aria-label={`Flipbook for ${title}`}
          >
            {/* Scale layer — grows the layout height via marginBottom */}
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                marginBottom: Math.round(displayHeight * (zoom - 1)),
              }}
            >
              {/* Pan layer — translates within the scaled space */}
              <div
                style={{
                  transform: isZoomed ? `translate(${panX}px, ${panY}px)` : undefined,
                  position: 'relative',
                }}
              >
                {/* Flipbook — mouse/drag events disabled while zoomed (pan overlay takes over) */}
                <div style={{ pointerEvents: isZoomed ? 'none' : 'auto' }}>
                  <HTMLFlipBook
                    ref={flipBookRef}
                    width={pageWidth}
                    height={displayHeight}
                    size="fixed"
                    minWidth={150}
                    maxWidth={520}
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

                {/* Pan overlay — sits on top when zoomed, captures all pointer events */}
                {isZoomed && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      cursor: isPanning ? 'grabbing' : 'grab',
                      touchAction: 'none',
                    }}
                    onPointerDown={handlePanStart}
                    onPointerMove={handlePanMove}
                    onPointerUp={handlePanEnd}
                    onPointerCancel={handlePanEnd}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
