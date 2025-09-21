'use client';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // add real providers later (theme, toaster, etc.)
  return <>{children}</>;
}

export default Providers;
