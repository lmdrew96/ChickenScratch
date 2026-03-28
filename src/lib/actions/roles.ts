'use server'

import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { profiles, userRoles } from '@/lib/db/schema'
import { ensureProfile } from '@/lib/auth/clerk'
import { env } from '@/lib/env'
import type { UserRole } from '@/types/database'

const ADMIN_POSITIONS = ['Dictator-in-Chief', 'Scroll Gremlin'] as const

type Position = 'BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Editor-in-Chief'

export async function getUserRole(userId: string): Promise<UserRole | { is_member: false; is_alumni: false; roles: ('officer' | 'committee')[]; positions: Position[] }> {
  const result = await db()
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, userId))
    .limit(1)

  if (!result[0]) {
    return { is_member: false, is_alumni: false, roles: [], positions: [] }
  }

  return result[0] as UserRole
}

export async function getCurrentUserRole(): Promise<UserRole | { is_member: false; is_alumni: false; roles: ('officer' | 'committee')[]; positions: Position[] } | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const profile = await ensureProfile(clerkId)
  if (!profile) return null

  return getUserRole(profile.id)
}

export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole()
  if (!role) return false

  if (ADMIN_POSITIONS.some((p) => role.positions?.includes(p))) {
    return true
  }

  // Emergency recovery: set EMERGENCY_ADMIN_EMAIL on Vercel to restore admin access
  // without needing DB access. Only checked when env var is present.
  if (env.EMERGENCY_ADMIN_EMAIL) {
    const { userId: clerkId } = await auth()
    if (clerkId) {
      const profile = await ensureProfile(clerkId)
      if (profile?.email === env.EMERGENCY_ADMIN_EMAIL) return true
    }
  }

  return false
}

export async function updateUserRole(
  userId: string,
  updates: Partial<Pick<UserRole, 'is_member' | 'is_alumni' | 'roles' | 'positions'>>
): Promise<{ data?: UserRole; error?: string | null }> {
  if (!await isAdmin()) {
    return { error: 'Unauthorized' }
  }

  const database = db()

  // Safety check: prevent removing the last admin
  if (updates.positions !== undefined) {
    const newPositions = (updates.positions ?? []) as string[]
    const removingAdminPosition = ADMIN_POSITIONS.some((p) => !newPositions.includes(p))

    if (removingAdminPosition) {
      // Check whether this user currently holds an admin position
      const current = await database
        .select({ positions: userRoles.positions })
        .from(userRoles)
        .where(eq(userRoles.user_id, userId))
        .limit(1)

      const currentPositions = (current[0]?.positions ?? []) as string[]
      const hadAdminPosition = ADMIN_POSITIONS.some((p) => currentPositions.includes(p))

      if (hadAdminPosition) {
        // Count other admins
        const allRoles = await database
          .select({ user_id: userRoles.user_id, positions: userRoles.positions })
          .from(userRoles)

        const otherAdminCount = allRoles.filter(
          (r) =>
            r.user_id !== userId &&
            ADMIN_POSITIONS.some((p) => (r.positions as string[])?.includes(p))
        ).length

        if (otherAdminCount === 0) {
          return {
            error:
              'Cannot remove the last admin. Assign another Dictator-in-Chief or Scroll Gremlin first.',
          }
        }
      }
    }
  }

  // Check if user already has a role entry
  const existing = await database
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(eq(userRoles.user_id, userId))
    .limit(1)

  if (existing[0]) {
    const result = await database
      .update(userRoles)
      .set(updates)
      .where(eq(userRoles.user_id, userId))
      .returning()

    return { data: result[0] as UserRole | undefined, error: null }
  } else {
    try {
      const result = await database
        .insert(userRoles)
        .values({
          user_id: userId,
          ...updates,
        })
        .returning()

      return { data: result[0] as UserRole | undefined, error: null }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Insert failed' }
    }
  }
}

type UserWithRole = {
  id: string
  email: string | null
  display_name?: string | null
  created_at?: string | null
  is_member?: boolean
  is_alumni?: boolean
  roles?: ('officer' | 'committee')[]
  positions?: Position[]
}

export async function getAllUsersWithRoles(): Promise<UserWithRole[]> {
  try {
    const database = db()

    // Get all profiles
    const allProfiles = await database.select().from(profiles)

    // Get all roles
    const allRoles = await database.select().from(userRoles)

    return allProfiles.map(profile => {
      const role = allRoles.find(r => r.user_id === profile.id)
      return {
        id: profile.id,
        email: profile.email,
        display_name: profile.full_name,
        created_at: profile.updated_at?.toISOString() ?? null,
        is_member: role?.is_member,
        is_alumni: role?.is_alumni,
        roles: (role?.roles as ('officer' | 'committee')[]) || [],
        positions: (role?.positions as Position[]) || []
      }
    })
  } catch (error) {
    console.error('Error in getAllUsersWithRoles:', error)
    return []
  }
}

type CreateTestUserParams = {
  email: string
  password: string
  is_member: boolean
  roles: ('officer' | 'committee')[]
  positions: Position[]
}

type CreateTestUserResult = {
  success: boolean
  user?: {
    id: string
    email: string
    password: string
  }
  error?: string
}

export async function createTestUser(params: CreateTestUserParams): Promise<CreateTestUserResult> {
  if (!await isAdmin()) {
    return { success: false, error: 'Unauthorized: Only admins can create test users' }
  }

  try {
    const database = db()

    // Create profile entry directly
    const profileResult = await database
      .insert(profiles)
      .values({
        id: crypto.randomUUID(),
        email: params.email,
        name: params.email.split('@')[0],
      })
      .returning({ id: profiles.id })

    const profile = profileResult[0]
    if (!profile) {
      return {
        success: false,
        error: 'Failed to create profile'
      }
    }

    // Create user_roles entry
    try {
      await database
        .insert(userRoles)
        .values({
          user_id: profile.id,
          is_member: params.is_member,
          roles: params.roles,
          positions: params.positions,
        })
    } catch (rolesError) {
      console.error('Error creating user roles:', rolesError)
      return {
        success: false,
        error: `Profile created but failed to assign roles: ${rolesError instanceof Error ? rolesError.message : 'Unknown error'}`
      }
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: params.email,
        password: params.password,
      }
    }
  } catch (error) {
    console.error('Error in createTestUser:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}
