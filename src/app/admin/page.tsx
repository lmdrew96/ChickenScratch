import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { desc } from 'drizzle-orm'
import { isAdmin, getAllUsersWithRoles } from '@/lib/actions/roles'
import { getMonthlyAttendanceSummaryByMember } from '@/lib/data/attendance-queries'
import { db } from '@/lib/db'
import { notificationFailures, siteConfig } from '@/lib/db/schema'
import Link from 'next/link'
import AdminPanel from './admin-panel'
import CreateTestUser from './create-test-user'
import NotificationFailures from './notification-failures'
import SiteConfigEditor from './site-config-editor'
import ToolkitLinksEditor from './toolkit-links-editor'
import StorageCleanup from './storage-cleanup'

export const dynamic = 'force-dynamic'

async function fetchSiteConfig(): Promise<Record<string, string>> {
  const rows = await db().select().from(siteConfig);
  const config: Record<string, string> = {};
  for (const row of rows) config[row.key] = row.value;
  return config;
}

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
  let siteConfigData: Record<string, string> = {}
  let attendanceSummary: Awaited<ReturnType<typeof getMonthlyAttendanceSummaryByMember>> = {}
  try {
    ;[users, failures, siteConfigData, attendanceSummary] = await Promise.all([
      getAllUsersWithRoles(),
      fetchFailures(),
      fetchSiteConfig(),
      getMonthlyAttendanceSummaryByMember(),
    ])
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
      <div className="mb-6 flex flex-wrap gap-4">
        <Link
          href="/admin/exhibition"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          🎉 Flock Party Submissions →
        </Link>
      </div>
      <CreateTestUser />
      {failures.length > 0 && (
        <div className="mt-8">
          <NotificationFailures initialFailures={failures} />
        </div>
      )}
      <div className="space-y-6 mt-8">
        <SiteConfigEditor initialConfig={siteConfigData} />
        <div id="toolkit-links">
          <ToolkitLinksEditor initialConfig={siteConfigData} />
        </div>
      </div>
      <div className="mt-8">
        <StorageCleanup />
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Manage Member Roles</h2>
        <AdminPanel
          initialUsers={users}
          attendanceSummary={attendanceSummary}
          officerPositions={
            siteConfigData.officer_positions
              ? (JSON.parse(siteConfigData.officer_positions) as string[])
              : undefined
          }
          committeePositions={
            siteConfigData.committee_positions
              ? (JSON.parse(siteConfigData.committee_positions) as string[])
              : undefined
          }
        />
      </div>
    </div>
  )
}
