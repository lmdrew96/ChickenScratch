import { redirect } from 'next/navigation';

import { getSessionWithProfile } from '@/lib/auth';

type RoleRequirement = string | string[];

function buildLoginRedirect(nextUrl?: string) {
  if (!nextUrl) {
    return '/login';
  }
  const encoded = encodeURIComponent(nextUrl);
  return `/login?next=${encoded}`;
}

export async function requireUser(nextUrl?: string) {
  const { session, profile } = await getSessionWithProfile();

  if (!session || !profile) {
    redirect(buildLoginRedirect(nextUrl));
  }

  return { session, profile };
}

export async function requireRole(role: RoleRequirement, nextUrl?: string) {
  const { session, profile } = await requireUser(nextUrl);
  const allowedRoles = Array.isArray(role) ? role : [role];
  const normalizedAllowed = allowedRoles.map((value) => value.toLowerCase());
  const currentRole = (profile.role ?? '').toLowerCase();

  if (currentRole === 'admin' || normalizedAllowed.includes(currentRole)) {
    return { session, profile };
  }

  redirect('/mine');
}
