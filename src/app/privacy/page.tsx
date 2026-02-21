import { PageHeader } from '@/components/navigation';

export const metadata = {
  title: 'Privacy Policy - Chicken Scratch',
  description: 'Privacy policy for the Chicken Scratch submissions portal',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader
        title="Privacy Policy"
        description="How we handle your information"
        showBackButton={true}
      />

      <div className="space-y-8 max-w-4xl">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm text-gray-400 mb-6">Last updated: February 2025</p>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Who we are</h2>
              <p className="text-gray-300 leading-relaxed">
                Chicken Scratch is the submissions portal for the Hen &amp; Ink Society, a student-run
                literary and art zine at the University of Delaware. This platform is built and
                maintained by students, for students and faculty.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">What we collect</h2>
              <p className="text-gray-300 leading-relaxed mb-2">
                When you create an account and use Chicken Scratch, we store:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2">
                <li>Your name and university email address (provided via Clerk authentication)</li>
                <li>Your profile information (pronouns, avatar) if you choose to add it</li>
                <li>Submissions you upload (writing files, visual art, metadata)</li>
                <li>Committee review activity for members with editorial roles</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">What we do not do</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2">
                <li>We do not sell, share, or rent your personal information to anyone</li>
                <li>We do not use analytics, tracking pixels, or advertising cookies</li>
                <li>We do not share your data with third parties for marketing purposes</li>
                <li>We do not profile your behavior or build advertising profiles</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Third-party services</h2>
              <p className="text-gray-300 leading-relaxed">
                We use the following services to operate the platform. Each processes only the minimum
                data necessary:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2 mt-2">
                <li><strong className="text-white">Clerk</strong> &mdash; authentication (email, name)</li>
                <li><strong className="text-white">Neon</strong> &mdash; database hosting (all application data)</li>
                <li><strong className="text-white">Cloudflare R2</strong> &mdash; file storage (submissions)</li>
                <li><strong className="text-white">Resend</strong> &mdash; transactional email delivery (notifications only)</li>
                <li><strong className="text-white">Vercel</strong> &mdash; application hosting</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Data retention</h2>
              <p className="text-gray-300 leading-relaxed">
                Your account and submissions are retained as long as your account is active. Published
                works remain in the public gallery unless you request removal. If you delete your
                account through Clerk, your profile is disassociated but submitted works may be
                retained for editorial continuity.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have questions about your data or want to request its removal, reach out to
                the Hen &amp; Ink Society editorial team through
                our <a href="/contact" className="text-[var(--accent)] hover:underline">contact page</a>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
