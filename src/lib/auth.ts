import { redirect } from 'next/navigation';

import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import { logHandledIssue } from '@/lib/logging';
import type { Profile } from '@/types/database';
import type { Session } from '@supabase/supabase-js';

export type SessionWithProfile = {
  session: Session | null;
  profile: Profile | null;
};

export async function getSessionWithProfile(): Promise<SessionWithProfile> {
  try {
    const supabase = await createSupabaseServerReadOnlyClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logHandledIssue('auth:get-session', {
        reason: 'Supabase session lookup failed',
        cause: error,
      });
      return { session: null, profile: null };
    }

    if (!session?.user) {
      return { session: null, profile: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      logHandledIssue('auth:get-profile', {
        reason: 'Supabase profile lookup failed',
        cause: profileError,
        context: { userId: session.user.id },
      });
      return { session, profile: null };
    }

    return { session, profile: profile ?? null };
  } catch (error) {
    logHandledIssue('auth:get-session:unexpected', {
      reason: 'Unexpected failure while retrieving session',
      cause: error,
    });
    return { session: null, profile: null };
  }
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
  if (!profile || !profile.role || !['editor', 'admin'].includes(profile.role)) {
    return null;
  }
  return { session, profile };
}

export function roleLandingPath(role: Profile['role']) {
  if (role === 'editor' || role === 'admin') {
    return '/editor';
  }
  return '/mine';
}
