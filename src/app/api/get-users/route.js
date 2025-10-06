import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  // Get all users from Clerk
  const users = await clerkClient.users.getUserList({ limit: 100 })
  
  // Get all roles from Supabase
  const { data: roles } = await supabase.from('user_roles').select('*')
  
  // Combine the data
  const usersWithRoles = users.map(user => {
    const role = roles?.find(r => r.user_id === user.id) || {}
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      is_member: role.is_member || false,
      role: role.role || null,
      position: role.position || null
    }
  })
  
  return NextResponse.json(usersWithRoles)
}
