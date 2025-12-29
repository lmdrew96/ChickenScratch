import { redirect } from 'next/navigation'
import { isAdmin, getAllUsersWithRoles } from '@/lib/actions/roles'
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'
import AdminPanel from './admin-panel'
import CreateTestUser from './create-test-user'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const isUserAdmin = await isAdmin()
  
  if (!isUserAdmin) {
    redirect('/mine')
  }
  
  // Wrap only the data fetching in try-catch, not the redirects
  let users
  try {
    users = await getAllUsersWithRoles()
  } catch (error) {
    console.error('Error fetching users:', error)
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Manage Member Roles</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold mb-2">Error loading users</p>
          <p className="text-red-700">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <p className="text-sm text-red-600 mt-2">
            Check the server logs for more details. Make sure SUPABASE_SERVICE_ROLE_KEY is set.
          </p>
        </div>
      </div>
    )
  }
  
  if (users.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Manage Member Roles</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No users found. This might be due to missing SUPABASE_SERVICE_ROLE_KEY in your environment variables.
            Check the server logs for more details.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <CreateTestUser />
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Manage Member Roles</h2>
        <AdminPanel initialUsers={users} />
      </div>
    </div>
  )
}
