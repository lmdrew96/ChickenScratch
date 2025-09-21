import { redirect } from 'next/navigation';

import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import type { Profile } from '@/types/database';
import type { Session } from '@supabase/supabase-js';

export type SessionWithProfile = {
  session: Session | null;
  profile: Profile | null;
};

export async function getSessionWithProfile(): Promise<SessionWithProfile> {
  const supabase = await createSupabaseServerReadOnlyClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { session: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  return { session, profile: profile ?? null };
}

export async function requireProfile() {
  const { session, profile } = await getSessionWithProfile();
  if (!session || !profile) {
    redirect('/login');
  }
  return { session, profile };
}

export async function requireEditorProfile() {
  const { session, profile } = await requireProfile();
  if (!profile || !['editor', 'admin'].includes(profile.role)) {
    redirect('/mine');
  }
  return { session, profile };
}

export function roleLandingPath(role: Profile['role']) {
  if (role === 'editor' || role === 'admin') {
    return '/editor';
  }
  return '/mine';
}
