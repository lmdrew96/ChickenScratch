'use client';
import type { ReactNode } from 'react';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
import { ToastProvider } from '@/components/ui/toast';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SupabaseProvider>{children}</SupabaseProvider>
    </ToastProvider>
  );
}