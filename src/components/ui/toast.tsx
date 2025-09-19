'use client';

import { createContext, useContext, useMemo, useCallback, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'info' | 'warning';
export type ToastOptions = { title?: string; description?: string; variant?: ToastVariant };

type ToastContextValue = { notify: (opts: ToastOptions) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [last, setLast] = useState<ToastOptions | null>(null);

  const notify = useCallback((opts: ToastOptions) => {
    setLast(opts);
    const prefix = opts.variant === 'error' ? '❌' : opts.variant === 'success' ? '✅' : 'ℹ️';
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log(`${prefix} ${opts.title ?? ''}`, opts.description ?? '');
    }
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('Toast context unavailable. Wrap components with <ToastProvider>.');
  return ctx;
}

export default useToast;