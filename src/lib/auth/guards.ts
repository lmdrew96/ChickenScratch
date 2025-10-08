import { redirect } from 'next/navigation';

import { getSessionWithProfile } from '@/lib/auth';
import { getCurrentUserRole } from '@/lib/actions/roles';

type RoleRequirement = string | string[];

// Officer positions (from user_roles table)
export const OFFICER_POSITIONS = ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'] as const;

// Committee positions (from user_roles table)
export const COMMITTEE_POSITIONS = ['Editor-in-Chief', 'Submissions Coordinator', 'Proofreader', 'Lead Design'] as const;

// Legacy officer roles (for backward compatibility with profiles table)
export const OFFICER_ROLES = ['bbeg', 'dictator_in_chief', 'scroll_gremlin', 'chief_hoarder', 'pr_nightmare'] as const;

// Legacy committee roles (for backward compatibility with profiles table)
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
  return (OFFICER_ROLES as readonly string[]).includes(role);
}

export function isCommitteeRole(role: string): boolean {
  return (COMMITTEE_ROLES as readonly string[]).includes(role);
}

export function isEditorRole(role: string): boolean {
  return (EDITOR_ROLES as readonly string[]).includes(role);
}

export function isOfficerPosition(position: string): boolean {
  return (OFFICER_POSITIONS as readonly string[]).includes(position);
}

export function isCommitteePosition(position: string): boolean {
  return (COMMITTEE_POSITIONS as readonly string[]).includes(position);
}

export function hasOfficerAccess(positions?: string[], roles?: string[]): boolean {
  // Check new user_roles table positions
  if (positions && positions.some(p => isOfficerPosition(p))) {
    return true;
  }
  // Check new user_roles table roles
  if (roles && roles.includes('officer')) {
    return true;
  }
  return false;
}

export function hasCommitteeAccess(positions?: string[], roles?: string[]): boolean {
  // Check new user_roles table positions
  if (positions && positions.some(p => isCommitteePosition(p))) {
    return true;
  }
  // Check new user_roles table roles
  if (roles && roles.includes('committee')) {
    return true;
  }
  return false;
}

export function hasEditorAccess(positions?: string[], roles?: string[]): boolean {
  // Editor-in-Chief has editor access
  if (positions && positions.includes('Editor-in-Chief')) {
    return true;
  }
  // Committee members have editor access
  if (roles && roles.includes('committee')) {
    return true;
  }
  return false;
}

export async function requireRole(role: RoleRequirement, nextUrl?: string) {
  const { session, profile } = await requireUser(nextUrl);
  
  // Check new user_roles table first
  const userRole = await getCurrentUserRole();
  
  if (userRole && userRole.is_member) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    const normalizedAllowed = allowedRoles.map((value) => value.toLowerCase());
    
    // Check if user has officer access (officers can access everything)
    if (hasOfficerAccess(userRole.positions, userRole.roles)) {
      return { session, profile };
    }
    
    // Check if user has committee access for committee/editor roles
    if (normalizedAllowed.includes('committee') || normalizedAllowed.includes('editor')) {
      if (hasCommitteeAccess(userRole.positions, userRole.roles) || hasEditorAccess(userRole.positions, userRole.roles)) {
        return { session, profile };
      }
    }
  }
  
  // Fallback to legacy profile.role check for backward compatibility
  const currentRole = (profile.role ?? '').toLowerCase();
  const allowedRoles = Array.isArray(role) ? role : [role];
  const normalizedAllowed = allowedRoles.map((value) => value.toLowerCase());

  if (currentRole === 'admin' || normalizedAllowed.includes(currentRole)) {
    return { session, profile };
  }

  redirect('/mine');
}

// Require officer role specifically
export async function requireOfficerRole(nextUrl?: string) {
  const { session, profile } = await requireUser(nextUrl);
  
  // Check new user_roles table first
  const userRole = await getCurrentUserRole();
  
  if (userRole && userRole.is_member) {
    // Check if user has officer access via positions or roles
    if (hasOfficerAccess(userRole.positions, userRole.roles)) {
      return { session, profile };
    }
  }
  
  // Fallback to legacy profile.role check for backward compatibility
  const currentRole = (profile.role ?? '').toLowerCase();

  if (currentRole === 'admin' || isOfficerRole(currentRole)) {
    return { session, profile };
  }

  redirect('/mine');
}

// Require committee role specifically  
export async function requireCommitteeRole(nextUrl?: string) {
  const { session, profile } = await requireUser(nextUrl);
  
  // Check new user_roles table first
  const userRole = await getCurrentUserRole();
  
  if (userRole && userRole.is_member) {
    // Officers have access to everything including committee pages
    if (hasOfficerAccess(userRole.positions, userRole.roles)) {
      return { session, profile };
    }
    // Check if user has committee access
    if (hasCommitteeAccess(userRole.positions, userRole.roles)) {
      return { session, profile };
    }
  }
  
  // Fallback to legacy profile.role check for backward compatibility
  const currentRole = (profile.role ?? '').toLowerCase();

  if (currentRole === 'admin' || isCommitteeRole(currentRole)) {
    return { session, profile };
  }

  redirect('/mine');
}
