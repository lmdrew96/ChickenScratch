import Link from 'next/link'
import PageHeader from '@/components/shell/page-header'

export default function HomePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Welcome to the Chicken Scratch Submissions Portal" />

      <p className="text-slate-300">
        This is your hub for sharing creative work with the Hen &amp; Ink community.
        Here you can submit new pieces, track your submissions, and explore what others have published.
      </p>

      <div className="grid gap-12 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>What you can do</h2>
          <ul className="mt-3 grid gap-2">
            <li>• <strong>Submit</strong> visual art or writing for consideration.</li>
            <li>• <strong>Track</strong> the status of your pieces in <em>My Submissions</em>.</li>
            <li>• <strong>Browse</strong> published work from the community.</li>
            <li>• Editors can <strong>review and provide feedback</strong> on assigned submissions (Editor dashboard).</li>
            <li>• Committee members can access <strong>planning resources</strong> (Committee).</li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-8">
            <Link href="/submit" className="btn btn-accent">Submit your work</Link>
            <Link href="/published" className="btn">Browse published</Link>
          </div>
        </section>

        <section className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)' }}>
          <div className="p-5">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>Quick links</h2>
            <div className="mt-4 grid gap-3">
              <Link href="/mine" className="btn">My Submissions</Link>
              <Link href="/editor" className="btn">Editor</Link>
              <Link href="/committee" className="btn">Committee</Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Editor/Committee areas require the appropriate role on your account.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
