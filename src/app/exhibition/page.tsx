import Link from 'next/link';
import { db } from '@/lib/db';
import { exhibitionConfig } from '@/lib/db/schema';
import { parseConfigDate } from '@/lib/utils';
import { getCurrentUserRole } from '@/lib/actions/roles';

export const dynamic = 'force-dynamic';

async function getExhibitionConfig(): Promise<Record<string, string>> {
  try {
    const rows = await db().select().from(exhibitionConfig);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  } catch {
    return {};
  }
}

export default async function ExhibitionPage() {
  const config = await getExhibitionConfig();
  const userRole = await getCurrentUserRole();
  const isMember = userRole?.is_member ?? false;

  const submissionsOpen = config.submissions_open !== 'false';
  const deadlineStr = config.submission_deadline ?? null;
  const exhibitionDate = config.exhibition_date ?? '2026-05-01';

  let isPastDeadline = false;
  let formattedDeadline = '';
  if (deadlineStr) {
    const deadlineDate = parseConfigDate(deadlineStr);
    isPastDeadline = !isNaN(deadlineDate.getTime()) && new Date() > deadlineDate;
    if (!isNaN(deadlineDate.getTime())) {
      formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York',
      });
    }
  }

  const exhibitionDateFormatted = parseConfigDate(exhibitionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });

  const accepting = submissionsOpen && !isPastDeadline;

  return (
    <>
      <style>{`
        @keyframes float-a {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        @keyframes float-b {
          0%, 100% { transform: translateY(0px) rotate(6deg); }
          50% { transform: translateY(-8px) rotate(-4deg); }
        }
        @keyframes float-c {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(-10px) rotate(8deg); }
          80% { transform: translateY(-4px) rotate(-5deg); }
        }
        @keyframes shimmer {
          0% { background-position: -400% center; }
          100% { background-position: 400% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,210,0,0); }
          50% { box-shadow: 0 0 28px 6px rgba(255,210,0,0.35); }
        }
        @keyframes badge-pop {
          0% { transform: scale(0.9); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .float-a { animation: float-a 5s ease-in-out infinite; }
        .float-b { animation: float-b 4s ease-in-out infinite 0.7s; }
        .float-c { animation: float-c 6s ease-in-out infinite 1.3s; }
        .float-d { animation: float-a 4.5s ease-in-out infinite 0.4s; }
        .float-e { animation: float-b 5.5s ease-in-out infinite 2s; }

        .shimmer-text {
          background: linear-gradient(
            90deg,
            #ffd200 0%,
            #fffbe6 30%,
            #ffd200 50%,
            #ffec6e 70%,
            #ffd200 100%
          );
          background-size: 400% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .btn-glow {
          animation: pulse-glow 2.5s ease-in-out infinite;
        }

        .badge-pop {
          animation: badge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .fade-up-1 { animation: fade-up 0.6s ease both 0.05s; }
        .fade-up-2 { animation: fade-up 0.6s ease both 0.15s; }
        .fade-up-3 { animation: fade-up 0.6s ease both 0.25s; }
        .fade-up-4 { animation: fade-up 0.6s ease both 0.4s; }

        .party-card {
          position: relative;
          overflow: hidden;
        }
        .party-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,210,0,0.04) 0%, transparent 55%);
          pointer-events: none;
        }
        .writing-card {
          background: linear-gradient(135deg, rgba(255,210,0,0.10) 0%, rgba(255,210,0,0.04) 100%);
          border: 1px solid rgba(255,210,0,0.20);
        }
        .art-card {
          background: linear-gradient(135deg, rgba(0,83,159,0.18) 0%, rgba(0,83,159,0.06) 100%);
          border: 1px solid rgba(0,120,255,0.20);
        }
        .deadline-banner {
          background: linear-gradient(90deg, rgba(255,210,0,0.10) 0%, rgba(255,210,0,0.04) 100%);
          border: 1px solid rgba(255,210,0,0.22);
        }
        .info-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color 0.2s ease;
        }
        .info-card:hover {
          border-color: rgba(255,210,0,0.25);
        }
      `}</style>

      <div className="mx-auto max-w-[70vw] px-4 py-8">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="relative mb-12">
          {/* Floating confetti */}
          <span aria-hidden className="float-a pointer-events-none select-none absolute -top-6 -left-10 text-3xl opacity-50">✨</span>
          <span aria-hidden className="float-b pointer-events-none select-none absolute -top-2 right-0 text-2xl opacity-40">🎉</span>
          <span aria-hidden className="float-c pointer-events-none select-none absolute top-14 -right-8 text-xl opacity-35">⭐</span>
          <span aria-hidden className="float-d pointer-events-none select-none absolute top-20 -left-12 text-2xl opacity-30">🎊</span>
          <span aria-hidden className="float-e pointer-events-none select-none absolute -top-8 left-40 text-lg opacity-25">✦</span>

          <div className="space-y-5">
            {/* Status badge */}
            <div className="badge-pop inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest"
              style={{ background: 'var(--accent)', color: '#003b72' }}>
              🐔
              <span>{accepting ? 'Now Accepting Submissions' : 'Submissions Closed'}</span>
              🐔
            </div>

            {/* Title */}
            <div className="fade-up-1">
              <h1 className="shimmer-text text-6xl font-black leading-none py-2.5 sm:text-6xl">
                Flock Party
              </h1>
              <p className="mt-2 text-lg font-semibold text-slate-300">
                Hen &amp; Ink Society&rsquo;s End&#8209;of&#8209;Year Celebration
              </p>
            </div>

            {/* Date card */}
            <div className="fade-up-2 inline-flex items-center gap-4 rounded-2xl px-5 py-4 max-w-content"
              style={{
                background: 'linear-gradient(135deg, rgba(255,210,0,0.12) 0%, rgba(255,210,0,0.05) 100%)',
                border: '1px solid rgba(255,210,0,0.28)',
              }}>
              <span className="text-3xl" aria-hidden>🗓️</span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Save the date</p>
                <p className="font-bold text-white">{exhibitionDateFormatted}</p>
                <p className="text-sm font-medium text-slate-400">Lewes Public Library</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>5–8pm</p>
              </div>
            </div>

            {/* Description */}
            <p className="fade-up-3 max-w-lg text-base leading-relaxed text-slate-400">
              Come celebrate the community we&rsquo;ve been building all year! Member writing and
              visual art will be on display for the entire UD community. Live poetry readings, storytelling,
              and one-act plays will be happening throughout the evening. We&rsquo;re gonna have a blast!
            </p>
          </div>
        </div>

        {/* ── Potluck signup CTA ───────────────────────────────── */}
        <section
          className="fade-up-3 mb-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-5"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,210,0,0.14) 0%, rgba(0,83,159,0.10) 100%)',
            border: '1px solid rgba(255,210,0,0.30)',
          }}
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl" aria-hidden>🍕</span>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                There&rsquo;s a potluck!
              </p>
              <p className="font-bold text-white">Sign up to bring something to the Flock Party</p>
              <p className="text-sm text-slate-300">
                Food, drinks, utensils, or anything else — claim your spot so we don&rsquo;t end up with
                fifteen bowls of hummus. Open to anyone with a <code className="rounded bg-white/10 px-1 py-0.5 text-xs">@udel.edu</code> email.
              </p>
            </div>
          </div>
          <Link
            href="/events/flock-party-2026-05"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ background: 'var(--accent)', color: '#003b72' }}
          >
            Potluck signup <span aria-hidden>→</span>
          </Link>
        </section>

        {/* ── What we accept ───────────────────────────────────── */}
        <section className="party-card mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-5 text-xl font-bold text-white">What we&rsquo;re looking for 🔍</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="writing-card space-y-3 rounded-xl p-4">
              <h3 className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--accent)' }}>
                <span className="text-xl">✍️</span> Short-form Writing
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Poetry', 'Prose & Fiction', 'Creative Nonfiction', 'Other written forms'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: 'var(--accent)' }}>◆</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="art-card space-y-3 rounded-xl p-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-blue-300">
                <span className="text-xl">🎨</span> Visual Art
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Painting & Drawing', 'Photography', 'Digital Art', 'Mixed Media'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-[10px] text-blue-400">◆</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Deadline + CTA ───────────────────────────────────── */}
        <section className="mb-8 space-y-5">
          {formattedDeadline && (
            <div className="deadline-banner flex items-center gap-4 rounded-xl px-5 py-4">
              <span className="text-2xl" aria-hidden>⏰</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Submission Deadline</p>
                <p className="font-semibold text-white">{formattedDeadline}</p>
              </div>
            </div>
          )}

          {accepting ? (
            isMember ? (
              <div className="fade-up-4 flex flex-wrap gap-4">
                <Link
                  href="/exhibition/submit"
                  className="btn-glow inline-flex items-center gap-2 rounded-xl px-7 py-3 text-[0.95rem] font-bold transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent)', color: '#003b72' }}
                >
                  Submit your work <span aria-hidden>🚀</span>
                </Link>
                <Link
                  href="/exhibition/mine"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-[0.95rem] font-semibold text-slate-200 transition-colors hover:border-white/25 hover:bg-white/10"
                >
                  My submissions
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-slate-400">
                  🔒 You must be a Hen & Ink Society member to submit work.
                </p>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-slate-400">
                {!submissionsOpen
                  ? 'Submissions are currently closed. Check back later or contact us for more information.'
                  : '🎊 The submission deadline has passed. Thank you to everyone who submitted — we can\'t wait to celebrate your work at the Flock Party!'}
              </p>
            </div>
          )}
        </section>

        {/* ── Info cards ───────────────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="info-card space-y-2 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <span>🐣</span> Who can submit?
            </h2>
            <p className="leading-relaxed text-slate-400">
              The Flock Party is open to all <b>Hen & Ink Society Members</b>. You&rsquo;ll need a Chicken Scratch
              account to submit — it only takes a moment to sign up.
            </p>
            <p className="leading-relaxed text-slate-400 text-[11px] italic" >If you&rsquo;re a Hen & Ink Society Member and you cannot
              access the Flock Party submission page, please <a href="mailto:lmdrew@udel.edu">contact Nae</a>. </p>
          </div>

          <div className="info-card space-y-2 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <span>📬</span> What happens next?
            </h2>
            <p className="leading-relaxed text-slate-400">
              Officers will review your work and email you their decision. Accepted pieces will be
              displayed at the Flock Party on {exhibitionDateFormatted}.
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
