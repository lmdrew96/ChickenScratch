'use client';
import * as React from 'react';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
};

export default function Drawer({ open, onOpenChange, title = 'Menu', children }: DrawerProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // 🔒 Closed = unmounted (removes section.fixed...translate-x-full entirely)
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed right-0 top-0 z-50 h-[100dvh] w-72 sm:w-80 border-l border-white/10 bg-[rgba(13,20,34,0.98)] shadow-2xl block-blue"
      >
        <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            ref={closeRef}
            onClick={() => onOpenChange(false)}
            className="btn"
            aria-label="Close menu"
          >
            ✕
          </button>
        </header>
        <div className="p-3">{children}</div>
      </section>
    </>
  );
}
