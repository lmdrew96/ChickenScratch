import { sql } from 'drizzle-orm';

import PageHeader from '@/components/shell/page-header';
import ZineIssuesManager from '@/components/committee/zine-issues/zine-issues-manager';
import { requireCommitteeRole } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { zineIssues } from '@/lib/db/schema';
import type { ZineIssue } from '@/types/database';

export default async function ZineIssuesPage() {
  await requireCommitteeRole('/committee/zine-issues');

  let issues: ZineIssue[] = [];

  try {
    issues = await db()
      .select()
      .from(zineIssues)
      .orderBy(sql`${zineIssues.publish_date} DESC NULLS LAST`);
  } catch (error) {
    console.error('Failed to fetch zine issues:', error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zine Issues"
        description="Manage published zine issues and Issuu embed codes."
      />
      <ZineIssuesManager initialIssues={issues} />
    </div>
  );
}
