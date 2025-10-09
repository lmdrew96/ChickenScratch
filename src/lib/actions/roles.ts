'use server'

import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Tables']['user_roles']['Row']

type Position = 'BBEG' | 'Dictator-in-Chief' | 'Scroll Gremlin' | 'Chief Hoarder' | 'PR Nightmare' | 'Submissions Coordinator' | 'Proofreader' | 'Lead Design' | 'Editor-in-Chief'

export async function getUserRole(userId: string): Promise<UserRole | { is_member: false; roles: ('officer' | 'committee')[]; positions: Position[] }> {
  const supabase = await createSupabaseServerReadOnlyClient()
  
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
  const supabase = await createSupabaseServerReadOnlyClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  return getUserRole(user.id)
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
  // Check if current user is admin FIRST
  if (!await isAdmin()) {
    return { error: 'Unauthorized' }
  }
  
  // Use admin client to bypass RLS for the actual update
  const adminClient = createSupabaseAdminClient()
  
  // Check if user already has a role entry
  const { data: existing } = await adminClient
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  if (existing) {
    // Update existing role
    const { data, error } = await adminClient
      .from('user_roles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()
    
    return { data: data || undefined, error: error?.message }
  } else {
    // Insert new role
    const { data, error } = await adminClient
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
    // Use admin client to list all users
    const adminClient = createSupabaseAdminClient()
    
    // Get all users from auth
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error listing users from auth:', usersError)
      // Fallback: get from profiles if admin API not available
      const { data: profiles, error: profilesError } = await adminClient
        .from('profiles')
        .select('*')
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return []
      }
      
      const { data: roles, error: rolesError } = await adminClient
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
    }
    
    // Get all profiles to get full names
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }
    
    // Get all roles
    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('*')
    
    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
    }
    
    return users?.map(user => {
      const role = roles?.find(r => r.user_id === user.id)
      const profile = profiles?.find(p => p.id === user.id)
      return {
        id: user.id,
        email: user.email ?? null,
        display_name: profile?.full_name,
        created_at: user.created_at,
        is_member: role?.is_member,
        roles: role?.roles || [],
        positions: role?.positions || []
      }
    }) || []
  } catch (error) {
    console.error('Error in getAllUsersWithRoles:', error)
    // Return empty array instead of throwing to prevent page crash
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
  // Check if current user is admin
  if (!await isAdmin()) {
    return { success: false, error: 'Unauthorized: Only admins can create test users' }
  }

  try {
    const adminClient = createSupabaseAdminClient()

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true, // Auto-confirm email for test users
    })

    if (authError || !authData.user) {
      console.error('Error creating user in auth:', authError)
      return { 
        success: false, 
        error: authError?.message || 'Failed to create user in authentication system' 
      }
    }

    // Create profile entry
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: params.email,
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Continue anyway - profile might already exist or be created by trigger
    }

    // Create user_roles entry with the specified roles and positions
    const { error: rolesError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        is_member: params.is_member,
        roles: params.roles,
        positions: params.positions,
      })

    if (rolesError) {
      console.error('Error creating user roles:', rolesError)
      return { 
        success: false, 
        error: `User created but failed to assign roles: ${rolesError.message}` 
      }
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
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
