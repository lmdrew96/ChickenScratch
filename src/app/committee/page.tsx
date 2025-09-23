import { requireRole } from '@/lib/auth/guards'
export const metadata = { title: 'Committee' }
export default async function CommitteePage() {
  await requireRole('committee','/committee')
  return (
    <div className="space-y-4">
      <h1>Committee</h1>
      <p>Internal resources for Zine Creation Committee members.</p>
      <div className="rounded-xl border border-white/15 bg-white/5 p-4">
        <ul className="list-disc pl-6">
          <li>Meeting notes</li>
          <li>Issue planning</li>
          <li>Style guide</li>
        </ul>
      </div>
    </div>
  )
}
