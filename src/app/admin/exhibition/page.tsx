import { redirect } from 'next/navigation';
import { desc, inArray, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { PageHeader } from '@/components/navigation';
import { db } from '@/lib/db';
import { exhibitionSubmissions, exhibitionConfig, userRoles, profiles } from '@/lib/db/schema';
import { hasOfficerAccess } from '@/lib/auth/guards';
import { ensureProfile } from '@/lib/auth/clerk';
import ExhibitionAdminPanel from '@/components/exhibition/exhibition-admin-panel';
import type { ExhibitionSubmission } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminExhibitionPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const profile = await ensureProfile(userId);
  if (!profile) redirect('/login');

  const database = db();

  const roleRows = await database
    .select({ roles: userRoles.roles, positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const role = roleRows[0];
  if (!role || !hasOfficerAccess(role.positions as string[], role.roles as string[])) {
    redirect('/mine');
  }

  let submissions: ExhibitionSubmission[] = [];
  const ownerMap: Record<string, { name: string | null; full_name: string | null; email: string | null }> = {};
  const config: Record<string, string> = {};

  try {
    submissions = await database
      .select()
      .from(exhibitionSubmissions)
      .orderBy(desc(exhibitionSubmissions.created_at));

    if (submissions.length > 0) {
      const ownerIds = [...new Set(submissions.map((s) => s.owner_id))];
      const ownerRows = await database
        .select({ id: profiles.id, name: profiles.name, full_name: profiles.full_name, email: profiles.email })
        .from(profiles)
        .where(inArray(profiles.id, ownerIds));
      for (const row of ownerRows) {
        ownerMap[row.id] = { name: row.name, full_name: row.full_name, email: row.email };
      }
    }

    const configRows = await database.select().from(exhibitionConfig);
    for (const row of configRows) {
      config[row.key] = row.value;
    }
  } catch (error) {
    console.error('[admin/exhibition] data fetch error:', error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exhibition Submissions"
        description="Review and manage submissions for the Hen & Ink Society's End-of-Year Flock Party"
      />
      <ExhibitionAdminPanel
        initialSubmissions={submissions}
        ownerMap={ownerMap}
        config={config}
      />
    </div>
  );
}
