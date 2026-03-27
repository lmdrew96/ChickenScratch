import { PageHeader } from '@/components/navigation';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'About Us - Hen & Ink Society',
  description: 'Learn about the Hen & Ink Society and Chicken Scratch zine'
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About Us"
        description="The story behind Hen & Ink Society and Chicken Scratch"
        showBackButton={true}
      />

      <div className="space-y-8 max-w-4xl">
        {/* Mission Statement */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          {/* Historic first — add this above the h2 */}
          <div className="flex items-center gap-2 mb-4 pl-3 border-l-2 border-[var(--accent)]">
            <p className="text-sm text-gray-400">
              <span className="text-[var(--accent)] font-semibold">Historic first:</span> The first RSO to emerge from one of UD&apos;s Associate in Arts Program satellite campuses.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>

          <p className="text-gray-300 leading-relaxed text-lg mb-4">
            The Hen &amp; Ink Society is based at UD&apos;s AAP Georgetown campus, and we exist to do something deceptively simple: <span className="text-white font-semibold">give creative people a place to belong.</span>
          </p>
          <p className="text-gray-300 leading-relaxed text-lg mb-4">
            As college students, we spend a lot of time reading and writing because we <em>have</em> to. Classes, assignments, requirements—it&apos;s easy to let all of that drain the joy out of what should be powerful forms of self-expression. The Hen &amp; Ink Society and <em>Chicken Scratch</em> exist to take that back. To remind ourselves and our peers that writing and art can be sources of inspiration and fulfillment—not just academic obligations.
          </p>
          <p className="text-gray-300 leading-relaxed text-lg mb-4">
            When we think about what Hen &amp; Ink really is, two words come to mind:
          </p>
          <div className="flex gap-3">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]">
              Expression
            </span>
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
              Connection
            </span>
          </div>
        </section>

        {/* About Hen & Ink Society */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Hen & Ink Society</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            We&apos;re a student-run creative organization that meets twice a week during common hour to write, make art, share feedback, and just be around other people who <em>get it</em>.
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            We&apos;ve coordinated carpool caravans to visit members on main campus, shown up for each other on our worst days, and—somewhere in between—managed to publish a pretty great zine.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Whether you&apos;re a writer, an artist, a photographer, someone who just likes being around creative people, or someone who hasn&apos;t made anything yet but wants to—<span className="text-white font-semibold">there&apos;s a spot for you in our flock.</span>
          </p>
        </section>

        {/* Scrapbook photos */}
        <div className="flex flex-wrap justify-center items-end gap-10 py-2">
          {/* Group photo — tilted left */}
          <div
            className="shrink-0 bg-white p-3 pb-10 shadow-2xl"
            style={{ transform: 'rotate(-2.5deg)', borderRadius: '4px', maxWidth: '240px' }}
          >
            <Image
              src="/hen-and-ink-outside-2025.jpg"
              alt="Hen & Ink Society members hanging out outside, fall 2025"
              width={214}
              height={268}
              className="block w-full object-cover"
              style={{ borderRadius: '2px' }}
            />
            <p className="mt-3 text-center font-fraunces italic text-sm text-gray-500">
              the flock, fall 2025
            </p>
          </div>

          {/* Geocaching photo — tilted right */}
          <div
            className="shrink-0 bg-white p-3 pb-10 shadow-2xl"
            style={{ transform: 'rotate(2deg)', borderRadius: '4px', maxWidth: '300px' }}
          >
            <Image
              src="/hen-and-ink-geocaching-find-2025.png"
              alt="Hen & Ink members celebrating a geocaching find, 2025"
              width={274}
              height={206}
              className="block w-full object-cover"
              style={{ borderRadius: '2px' }}
            />
            <p className="mt-3 text-center font-fraunces italic text-sm text-gray-500">
              geocaching adventure, 2025
            </p>
          </div>
        </div>

        {/* About Chicken Scratch */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Chicken Scratch Zine</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            <em>Chicken Scratch</em> is our flagship monthly publication featuring original poetry, fiction, essays, visual art, photography, and more—all created by UD students. Every issue goes through a thoughtful review process by our editorial Creation Committee.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Since Issue #1 in September 2025, we&apos;ve featured faculty interviews, member spotlights, literary recommendations, and opinion pieces that actually say something. Our submission portal is always open to all UD students {' '}
            <a href="/submit" className="text-[var(--accent)] hover:underline">HERE</a>.
          </p>
        </section>

        {/* Showcase Member Work */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Check Us Out!</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Flip through an Issue</h3>
              <p className="text-gray-300 leading-relaxed mb-3">
                Catch up on the latest issues of Chicken Scratch. See the final product of our creative process.
              </p>
              <Link href="/issues" className="btn btn-accent inline-flex">
                View Published Issues
              </Link>
            </div>

            <div className="pt-4">
              <h3 className="text-xl font-semibold text-white mb-2">Read Published Works</h3>
              <p className="text-gray-300 leading-relaxed mb-3">
                Explore our collection of published pieces and discover the amazing talent in our community.
              </p>
              <Link href="/published" className="btn inline-flex">
                Published Works Gallery
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Have questions or want to get involved? We&apos;d love to hear from you!
          </p>
          <Link href="/contact" className="btn btn-accent inline-flex mb-6">
            Visit Our Contact Page
          </Link>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <svg
              className="w-6 h-6 text-[var(--accent)]"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <div>
              <a
                href="https://discord.gg/MNpNfa9sPP"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:text-[#e6bb00] font-semibold transition-colors"
              >
                Join our Discord community
              </a>
              <p className="text-sm text-gray-400">Chat with us and stay updated on events and submissions</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
