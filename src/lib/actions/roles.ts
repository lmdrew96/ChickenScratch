'use server'

import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { profiles, userRoles } from '@/lib/db/schema'
import { ensureProfile } from '@/lib/auth/clerk'
import type { UserRole } from '@/types/database'

type Position = 'BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief'

export async function getUserRole(userId: string): Promise<UserRole | { is_member: false; roles: ('officer' | 'committee')[]; positions: Position[] }> {
  const result = await db()
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, userId))
    .limit(1)

  if (!result[0]) {
    return { is_member: false, roles: [], positions: [] }
  }

  return result[0] as UserRole
}

export async function getCurrentUserRole(): Promise<UserRole | { is_member: false; roles: ('officer' | 'committee')[]; positions: Position[] } | null> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const profile = await ensureProfile(clerkId)
  if (!profile) return null

  return getUserRole(profile.id)
}

export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole()
  if (!role) return false
  return role.positions?.includes('BBEG') === true || role.positions?.includes('Dictator-in-Chief') === true
}

export async function updateUserRole(
  userId: string,
  updates: Partial<Pick<UserRole, 'is_member' | 'roles' | 'positions'>>
): Promise<{ data?: UserRole; error?: string | null }> {
  if (!await isAdmin()) {
    return { error: 'Unauthorized' }
  }

  const database = db()

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
