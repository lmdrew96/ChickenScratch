'use client';

import { Download, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useRef } from 'react';

const ATTEND_URL = 'https://chickenscratch.me/attend';
const QR_PIXEL_SIZE = 1024; // high-res canvas for clean print/download
const ON_SCREEN_SIZE = 220;

export function QrCodeCard() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const onDownload = () => {
    const canvas = wrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hen-and-ink-attendance-qr.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const onPrint = () => {
    window.print();
  };

  return (
    <section className="qr-print-target rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">QR check-in code</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Print this and post it in the meeting room. Members scan with their phone camera
            to land on <span className="text-slate-200">/attend</span>. Recommended size:
            4×4 inches or larger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#003b72] hover:bg-[#e6bb00]"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div
          ref={wrapperRef}
          className="qr-print-canvas rounded-xl bg-white p-4"
          style={{ width: ON_SCREEN_SIZE + 32, height: ON_SCREEN_SIZE + 32 }}
        >
          <QRCodeCanvas
            value={ATTEND_URL}
            size={QR_PIXEL_SIZE}
            level="H"
            marginSize={2}
            imageSettings={{
              src: '/logo.png',
              height: QR_PIXEL_SIZE * 0.18,
              width: QR_PIXEL_SIZE * 0.18,
              excavate: true,
            }}
            style={{ width: ON_SCREEN_SIZE, height: ON_SCREEN_SIZE, display: 'block' }}
          />
        </div>
        <p className="qr-print-caption text-center text-xs text-slate-400">
          Scan to check in · {ATTEND_URL.replace('https://', '')}
        </p>
      </div>
    </section>
  );
}
