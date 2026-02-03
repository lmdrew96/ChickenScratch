import { redirect } from 'next/navigation';

import { getClerkUserId, ensureProfile } from '@/lib/auth/clerk';
import { logHandledIssue } from '@/lib/logging';
import type { Profile } from '@/types/database';

export type SessionWithProfile = {
  userId: string | null;
  profile: Profile | null;
};

export async function getSessionWithProfile(): Promise<SessionWithProfile> {
  try {
    const userId = await getClerkUserId();

    if (!userId) {
      return { userId: null, profile: null };
    }

    const profile = await ensureProfile(userId);

    if (!profile) {
      logHandledIssue('auth:get-profile', {
        reason: 'Profile lookup/creation failed for Clerk user',
        context: { clerkUserId: userId },
      });
      return { userId, profile: null };
    }

    return { userId, profile };
  } catch (error) {
    logHandledIssue('auth:get-session:unexpected', {
      reason: 'Unexpected failure while retrieving session',
      cause: error,
    });
    return { userId: null, profile: null };
  }
}

export async function requireProfile() {
  const { userId, profile } = await getSessionWithProfile();
  if (!userId || !profile) {
    redirect('/login');
  }
  return { userId, profile };
}

export async function requireEditorProfile() {
  const { userId, profile } = await requireProfile();
  if (!profile || !profile.role || !['editor', 'admin'].includes(profile.role)) {
    return null;
  }
  return { userId, profile };
}

export function roleLandingPath(role: Profile['role']) {
  if (role === 'editor' || role === 'admin') {
    return '/editor';
  }
  return '/mine';
}
