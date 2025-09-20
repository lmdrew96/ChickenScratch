'use client';

import { ToastProvider } from '@/components/ui/toast';

import { SupabaseProvider } from './supabase-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <ToastProvider>{children}</ToastProvider>
    </SupabaseProvider>
  );
}
