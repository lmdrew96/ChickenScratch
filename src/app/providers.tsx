'use client';
import React from 'react';
import Toaster from '@/components/ui/toast';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
export default function Providers({ children }:{ children: React.ReactNode }){
  return <SupabaseProvider>{children}<Toaster/></SupabaseProvider>;
}
