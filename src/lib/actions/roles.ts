'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/supabase/db'
import { ensureProfile } from '@/lib/auth/clerk'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Tables']['user_roles']['Row']

type Position = 'BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief'

export async function getUserRole(userId: string): Promise<UserRole | { is_member: false; roles: ('officer' | 'committee')[]; positions: Position[] }> {
  const supabase = db()

  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return { is_member: false, roles: [], positions: [] }
  }

  return data
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
  return role.positions?.includes('BBEG') || role.positions?.includes('Dictator-in-Chief')
}

export async function updateUserRole(
  userId: string,
  updates: Database['public']['Tables']['user_roles']['Update']
): Promise<{ data?: UserRole; error?: string | null }> {
  if (!await isAdmin()) {
    return { error: 'Unauthorized' }
  }

  const supabase = db()

  // Check if user already has a role entry
  const { data: existing } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('user_roles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    return { data: data || undefined, error: error?.message }
  } else {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        ...updates
      })
      .select()
      .single()

    return { data: data || undefined, error: error?.message }
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
    const supabase = db()

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return []
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
    }

    return profiles?.map(profile => {
      const role = roles?.find(r => r.user_id === profile.id)
      return {
        id: profile.id,
        email: profile.email,
        display_name: profile.full_name,
        created_at: profile.updated_at,
        is_member: role?.is_member,
        roles: role?.roles || [],
        positions: role?.positions || []
      }
    }) || []
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
    const supabase = db()

    // Create profile entry directly (no Supabase Auth user needed)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        email: params.email,
        name: params.email.split('@')[0],
      })
      .select('id')
      .single()

    if (profileError || !profile) {
      console.error('Error creating profile:', profileError)
      return {
        success: false,
        error: profileError?.message || 'Failed to create profile'
      }
    }

    // Create user_roles entry
    const { error: rolesError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        is_member: params.is_member,
        roles: params.roles,
        positions: params.positions,
      })

    if (rolesError) {
      console.error('Error creating user roles:', rolesError)
      return {
        success: false,
        error: `Profile created but failed to assign roles: ${rolesError.message}`
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
