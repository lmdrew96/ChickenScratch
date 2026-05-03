import Link from 'next/link';

export const metadata = {
  title: 'Under Construction — Chicken Scratch',
  description: 'Chicken Scratch is briefly down for maintenance. We’ll be back shortly.',
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="min-h-[100svh] flex items-center justify-center px-6 py-16 bg-[var(--bg)] text-[var(--text)]">
      <div className="relative w-full max-w-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-4 select-none font-guavine text-[14rem] leading-none text-white/[0.04]"
        >
          &ldquo;
        </div>

        <p className="mb-4 text-xs tracking-[0.2em] uppercase font-semibold text-[var(--accent)]">
          Hen &amp; Ink Society
        </p>

        <div
          className="mb-5 h-px"
          style={{ backgroundImage: 'linear-gradient(to right, var(--accent), transparent)' }}
        />

        <h1 className="font-guavine text-5xl sm:text-6xl font-black text-white tracking-tight leading-none mb-5">
          Under Construction
        </h1>

        <div
          className="mb-6 h-px"
          style={{ backgroundImage: 'linear-gradient(to right, var(--accent), transparent)' }}
        />

        <p className="text-xl sm:text-2xl italic text-gray-300 mb-5">
          Pardon the scratching &mdash; we&rsquo;re reworking the coop.
        </p>

        <p className="text-gray-400 leading-relaxed mb-8">
          <em>Chicken Scratch</em> is briefly offline while we make some improvements.
          The submission portal, member hub, and published archive will be back soon.
          Thanks for your patience.
        </p>

        <div className="flex flex-wrap gap-4">
          <a href="mailto:henandinksociety@gmail.com" className="btn btn-accent">
            Contact us
          </a>
          <Link href="/login" className="btn">
            Member sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
