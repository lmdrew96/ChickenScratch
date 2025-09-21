'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Chicken Scratch encountered an unrecoverable error.', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white">Something went wrong</h1>
            <p className="text-sm text-white/70">
              An unexpected error occurred while loading Chicken Scratch. Try refreshing the page or return to the
              published gallery.
            </p>
            {error.digest ? (
              <p className="text-xs text-white/40">Reference code: {error.digest}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20"
            >
              Try again
            </button>
            <Link
              href="/published"
              className="rounded-md border border-white/20 px-4 py-2 font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Go to published gallery
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
