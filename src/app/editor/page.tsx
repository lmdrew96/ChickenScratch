import { requireRole } from '@/lib/auth/guards'
export const metadata = { title: 'Editor Dashboard' }
export default async function EditorPage() {
  await requireRole(['editor','committee'],'/editor')
  return (
    <div className="space-y-4">
      <h1>Editor Dashboard</h1>
      <p>Assign, review, and publish submissions.</p>
      <div className="rounded-xl border border-white/15 bg-white/5 p-4">
        <p>No items yet.</p>
      </div>
    </div>
  )
}
