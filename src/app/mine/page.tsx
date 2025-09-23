import { requireUser } from '@/lib/auth/guards'
export const metadata = { title: 'My Submissions' }
export default async function MySubmissionsPage() {
  await requireUser('/mine')
  return (
    <div className="space-y-4">
      <h1>My Submissions</h1>
      <p>Track your pieces, upload revisions, and see editorial notes.</p>
      <div className="rounded-xl border border-white/15 bg-white/5 p-4">
        <p>No submissions yet.</p>
      </div>
    </div>
  )
}
