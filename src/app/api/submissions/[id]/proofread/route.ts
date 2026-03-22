import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, auditLog, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';

const schema = z.object({
  html: z.string().min(1).max(500_000),
});

/** Strip dangerous tags/attributes from TipTap output. */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .trim();
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();

  const roleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const roleData = roleRows[0];
  if (!roleData?.is_member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const positions = roleData.positions ?? [];
  const roles = roleData.roles ?? [];
  if (!hasOfficerAccess(positions, roles) && !hasCommitteeAccess(positions, roles)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const cleanHtml = sanitizeHtml(parsed.data.html);

  await database
    .update(submissions)
    .set({ proofread_html: cleanHtml })
    .where(eq(submissions.id, id));

  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'proofread_html_saved',
    details: { length: cleanHtml.length },
  });

  return NextResponse.json({ success: true });
}
