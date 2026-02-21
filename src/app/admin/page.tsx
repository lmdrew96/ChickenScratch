import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { desc } from 'drizzle-orm'
import { isAdmin, getAllUsersWithRoles } from '@/lib/actions/roles'
import { db } from '@/lib/db'
import { notificationFailures } from '@/lib/db/schema'
import AdminPanel from './admin-panel'
import CreateTestUser from './create-test-user'
import NotificationFailures from './notification-failures'

export const dynamic = 'force-dynamic'

async function fetchFailures() {
  const rows = await db()
    .select()
    .from(notificationFailures)
    .orderBy(desc(notificationFailures.created_at))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    recipient: r.recipient,
    subject: r.subject,
    error_message: r.error_message,
    context: r.context as Record<string, unknown> | null,
    created_at: r.created_at?.toISOString() ?? new Date().toISOString(),
  }));
}

export default async function AdminPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  const isUserAdmin = await isAdmin()
  
  if (!isUserAdmin) {
    redirect('/mine')
  }
  
  // Wrap only the data fetching in try-catch, not the redirects
  let users
  let failures: Awaited<ReturnType<typeof fetchFailures>> = []
  try {
    users = await getAllUsersWithRoles()
    failures = await fetchFailures()
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
            Check the server logs for more details. Make sure DATABASE_URL is set.
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
            No users found. This might be due to missing DATABASE_URL in your environment variables.
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
      {failures.length > 0 && (
        <div className="mt-8">
          <NotificationFailures initialFailures={failures} />
        </div>
      )}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Manage Member Roles</h2>
        <AdminPanel initialUsers={users} />
      </div>
    </div>
  )
}
