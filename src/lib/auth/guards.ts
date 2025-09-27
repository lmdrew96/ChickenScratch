import { redirect } from 'next/navigation';

import { getSessionWithProfile } from '@/lib/auth';

type RoleRequirement = string | string[];

// Officer roles
export const OFFICER_ROLES = ['bbeg', 'dictator_in_chief', 'scroll_gremlin', 'chief_hoarder', 'pr_nightmare'] as const;

// Committee roles  
export const COMMITTEE_ROLES = ['editor_in_chief', 'submissions_coordinator', 'proofreader', 'lead_design'] as const;

// Legacy editor role
export const EDITOR_ROLES = ['editor'] as const;

// All privileged roles
export const ALL_PRIVILEGED_ROLES = [...OFFICER_ROLES, ...COMMITTEE_ROLES, ...EDITOR_ROLES] as const;

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

export function isOfficerRole(role: string): boolean {
  return OFFICER_ROLES.includes(role as any);
}

export function isCommitteeRole(role: string): boolean {
  return COMMITTEE_ROLES.includes(role as any);
}

export function isEditorRole(role: string): boolean {
  return EDITOR_ROLES.includes(role as any);
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

// Require officer role specifically
export async function requireOfficerRole(nextUrl?: string) {
  const { session, profile } = await requireUser(nextUrl);
  const currentRole = (profile.role ?? '').toLowerCase();

  if (currentRole === 'admin' || isOfficerRole(currentRole)) {
    return { session, profile };
  }

  redirect('/mine');
}

// Require committee role specifically  
export async function requireCommitteeRole(nextUrl?: string) {
  const { session, profile } = await requireUser(nextUrl);
  const currentRole = (profile.role ?? '').toLowerCase();

  if (currentRole === 'admin' || isCommitteeRole(currentRole)) {
    return { session, profile };
  }

  redirect('/mine');
}
