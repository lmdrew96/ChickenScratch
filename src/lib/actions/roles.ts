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
          is_member: role?.is_member,
          roles: role?.roles || [],
          positions: role?.positions || []
        }
      }) || []
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
      return {
        id: user.id,
        email: user.email ?? null,
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
