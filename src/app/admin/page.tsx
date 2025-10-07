import { redirect } from 'next/navigation'
import { isAdmin, getAllUsersWithRoles, getCurrentUserRole } from '@/lib/actions/roles'
import AdminPanel from './admin-panel'
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'

export default async function AdminPage() {
  // Get user info for debugging
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('=== ADMIN PAGE DEBUG ===')
  console.log('Current user:', user?.id)
  console.log('User email:', user?.email)
  
  if (!user) {
    console.log('No user found, redirecting to login')
    redirect('/login')
  }
  
  // Get the user's role data
  const roleData = await getCurrentUserRole()
  console.log('User role data:', JSON.stringify(roleData, null, 2))
  
  // Check if user is admin
  const isUserAdmin = await isAdmin()
  console.log('Is admin check result:', isUserAdmin)
  console.log('Positions value:', roleData?.positions)
  console.log('Has BBEG:', roleData?.positions?.includes('BBEG'))
  console.log('Has Dictator-in-Chief:', roleData?.positions?.includes('Dictator-in-Chief'))
  console.log('========================')
  
  if (!isUserAdmin) {
    console.log('User is not admin, redirecting to /mine')
    redirect('/mine')
  }
  
  const users = await getAllUsersWithRoles()
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Member Roles</h1>
      <AdminPanel initialUsers={users} />
    </div>
  )
}
