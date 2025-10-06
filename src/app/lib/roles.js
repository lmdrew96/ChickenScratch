import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Check if user has a specific role
export async function checkUserRole(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) return { is_member: false, role: null, position: null }
  return data
}

// Check if user is an officer
export async function isOfficer(userId) {
  const role = await checkUserRole(userId)
  return role.role === 'officer'
}

// Check if user is a member
export async function isMember(userId) {
  const role = await checkUserRole(userId)
  return role.is_member === true
}

// Update user role (admin only)
export async function updateUserRole(userId, updates) {
  const { data, error } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      ...updates
    })
    .select()
  
  return { data, error }
}
