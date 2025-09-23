import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import PageHeader from '@/components/shell/page-header';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Piece = {
  id: string;
  title?: string | null;
  author?: string | null;
  type?: string | null;
  excerpt?: string | null;
  cover_url?: string | null;
  slug?: string | null;
  published_at?: string | null;
};

export default async function PublishedPage() {
  const supabase = await getSupabaseServerClient();

  const { data } = await supabase
    .from('submissions')
    .select('id,title,author:author_name,type,excerpt,cover_url,slug,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(48);

  const items = (data as Piece[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <PageHeader title="Published Pieces" />
        <p>
          Explore the latest stories and artwork from the Chicken Scratch community.
          Visual work includes signed download links valid for seven days.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="badge badge-accent mb-3">Nothing here… yet</div>
          <p className="text-slate-300">No published work yet. Check back soon!</p>
          <div className="mt-6">
            <Link href="/submit" className="btn btn-brand">Submit your work</Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            const href = it.slug ? `/published/${it.slug}` : `/published/${it.id}`;
            return (
              <li key={it.id}>
                <Link href={href} className="block no-underline group">
                  <article className="card overflow-hidden">
                    {/* image */}
                    {it.cover_url ? (
                      <div className="relative aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.cover_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          style={{ maskImage: 'linear-gradient(180deg, #000 85%, transparent)' }}
                        />
                        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset" style={{ ringColor: 'var(--line)' }} />
                      </div>
                    ) : null}

                    {/* content */}
                    <div className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="badge badge-accent text-xs">
                          {(it.type ?? '—').replace(/_/g, ' ')}
                        </span>
                        {it.published_at ? (
                          <span className="badge text-xs">
                            {new Date(it.published_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-lg font-semibold text-slate-100 group-hover:text-white line-clamp-2">
                        {it.title || 'Untitled'}
                      </h3>
                      {it.excerpt ? (
                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{it.excerpt}</p>
                      ) : null}
                      <div className="mt-3 text-xs text-slate-400">
                        {it.author ? `By ${it.author}` : 'Anonymous'}
                      </div>
                    </div>

                    {/* accent edge */}
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--brand), var(--accent))' }} />
                  </article>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
