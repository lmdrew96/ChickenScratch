'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { clsx } from 'clsx';

export type ToastVariant = 'success' | 'error' | 'info';

type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  notify: (toast: Omit<ToastRecord, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, description, variant }: Omit<ToastRecord, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, title, description, variant }]);
      setTimeout(() => dismiss(id), DEFAULT_DURATION);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('Toast context unavailable. Wrap components with <ToastProvider>.');
  }
  return ctx;
}

type ToastViewportProps = {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
};

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto w-full max-w-sm rounded-md border px-4 py-3 shadow-lg backdrop-blur-sm sm:w-auto',
            toast.variant === 'success' && 'border-emerald-400/60 bg-emerald-900/70 text-emerald-50',
            toast.variant === 'error' && 'border-rose-400/60 bg-rose-900/70 text-rose-50',
            toast.variant === 'info' && 'border-sky-400/60 bg-sky-900/70 text-sky-50'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold leading-tight">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm leading-snug text-white/80">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded px-2 py-1 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
