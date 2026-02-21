import { PageHeader } from '@/components/navigation';

export const metadata = {
  title: 'Terms of Service - Chicken Scratch',
  description: 'Terms of service for the Chicken Scratch submissions portal',
};

export default function TermsOfServicePage() {
  return (
    <>
      <PageHeader
        title="Terms of Service"
        description="Rules for using Chicken Scratch"
        showBackButton={true}
      />

      <div className="space-y-8 max-w-4xl">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm text-gray-400 mb-6">Last updated: February 2025</p>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Overview</h2>
              <p className="text-gray-300 leading-relaxed">
                Chicken Scratch is a submissions portal operated by the Hen &amp; Ink Society at
                the University of Delaware. By using this platform you agree to the following terms.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Eligibility</h2>
              <p className="text-gray-300 leading-relaxed">
                Chicken Scratch is available to current University of Delaware students and faculty.
                You must sign up with a valid university email address. Accounts that do not meet
                this requirement may be removed.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Your submissions</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2">
                <li>You must own or have rights to everything you submit</li>
                <li>You retain full ownership of your work &mdash; we do not claim any rights to it</li>
                <li>By submitting, you grant Hen &amp; Ink Society a non-exclusive license to
                    publish the work in Chicken Scratch (print and digital)</li>
                <li>You may withdraw a submission at any time before it is published</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Acceptable use</h2>
              <p className="text-gray-300 leading-relaxed mb-2">
                When using Chicken Scratch, you agree not to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2">
                <li>Submit work that is not your own or that you do not have permission to share</li>
                <li>Upload malicious files or content intended to disrupt the platform</li>
                <li>Misuse committee or officer tools if granted editorial access</li>
                <li>Attempt to access other users&apos; accounts or private data</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Editorial decisions</h2>
              <p className="text-gray-300 leading-relaxed">
                The Hen &amp; Ink Society editorial committee reviews all submissions. Acceptance,
                revision requests, and declinations are made at the committee&apos;s discretion.
                We strive to provide constructive feedback with every decision.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Account termination</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to suspend or remove accounts that violate these terms or
                University of Delaware policies. You can delete your account at any time through
                your account settings.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Changes to these terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update these terms from time to time. Continued use of the platform after
                changes are posted constitutes acceptance of the updated terms.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
              <p className="text-gray-300 leading-relaxed">
                Questions about these terms? Reach out through
                our <a href="/contact" className="text-[var(--accent)] hover:underline">contact page</a>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
