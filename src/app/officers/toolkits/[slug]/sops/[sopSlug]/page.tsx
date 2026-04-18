import { notFound } from 'next/navigation';

import PageHeader from '@/components/shell/page-header';
import { officerToolkits } from '@/lib/data/toolkits';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getSopArticle } from '@/lib/data/sop-queries';
import { SopEditor } from '@/components/officers/toolkit/sops/sop-editor';

export default async function SopArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; sopSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, sopSlug } = await params;
  const search = await searchParams;
  await requireOfficerRole(`/officers/toolkits/${slug}/sops/${sopSlug}`);
  const toolkit = officerToolkits.find((t) => t.slug === slug);
  if (!toolkit) notFound();
  const article = await getSopArticle(slug, sopSlug);
  if (!article) notFound();

  const startInEdit = search.edit === '1';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${toolkit.title} SOP`}
        description={article.title}
        showBackButton
        backButtonHref={`/officers/toolkits/${slug}/sops`}
        backButtonLabel="Back to SOP Library"
      />
      <SopEditor
        id={article.id}
        roleSlug={slug}
        initialTitle={article.title}
        initialBody={article.body_md}
        initialTags={article.tags ?? []}
        initialIsDraft={article.is_draft}
        startInEdit={startInEdit}
      />
    </div>
  );
}
