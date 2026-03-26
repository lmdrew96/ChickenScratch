import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { zineIssues, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  volume: z.number().int().positive().nullable().optional(),
  issue_number: z.number().int().positive().nullable().optional(),
  publish_date: z.string().nullable().optional(),
  pdf_url: z.string().url().nullable().optional(),
  is_published: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  volume: z.number().int().positive().nullable().optional(),
  issue_number: z.number().int().positive().nullable().optional(),
  publish_date: z.string().nullable().optional(),
  pdf_url: z.string().url().nullable().optional(),
  is_published: z.boolean().optional(),
});

async function requireCommitteeAuth() {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized', status: 401 } as const;

  const profile = await ensureProfile(userId);
  if (!profile) return { error: 'Unauthorized', status: 401 } as const;

  const database = db();
  const userRoleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);
  const userRoleData = userRoleRows[0] ?? null;

  if (!userRoleData || !userRoleData.is_member) {
    return { error: 'Forbidden', status: 403 } as const;
  }
  if (
    !hasCommitteeAccess(userRoleData.positions, userRoleData.roles) &&
    !hasOfficerAccess(userRoleData.positions, userRoleData.roles)
  ) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  return { profile, database };
}

export async function GET() {
  try {
    const issues = await db()
      .select()
      .from(zineIssues)
      .where(eq(zineIssues.is_published, true))
      .orderBy(desc(zineIssues.publish_date));
    return NextResponse.json({ issues });
  } catch (error) {
    console.error('[zine-issues:GET]', error);
    return NextResponse.json({ error: 'Failed to load issues.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireCommitteeAuth();
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { profile, database } = authResult;

  const limit = rateLimit(`zine-issues:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data.', details: parsed.error.flatten() }, { status: 400 });
  }

  const { title, volume, issue_number, publish_date, pdf_url, is_published } = parsed.data;

  const [issue] = await database
    .insert(zineIssues)
    .values({
      title,
      volume: volume ?? null,
      issue_number: issue_number ?? null,
      publish_date: publish_date ? new Date(publish_date) : null,
      pdf_url: pdf_url ?? null,
      is_published: is_published ?? false,
    })
    .returning();

  revalidatePath('/issues');
  revalidatePath('/committee/zine-issues');
  return NextResponse.json({ issue }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireCommitteeAuth();
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { profile, database } = authResult;

  const limit = rateLimit(`zine-issues:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data.', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, publish_date, ...rest } = parsed.data;

  const updatePayload: Record<string, unknown> = { ...rest };
  if (publish_date !== undefined) {
    updatePayload.publish_date = publish_date ? new Date(publish_date) : null;
  }

  const [updated] = await database
    .update(zineIssues)
    .set(updatePayload)
    .where(eq(zineIssues.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Issue not found.' }, { status: 404 });
  }

  revalidatePath('/issues');
  revalidatePath('/committee/zine-issues');
  return NextResponse.json({ issue: updated });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireCommitteeAuth();
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { profile, database } = authResult;

  const limit = rateLimit(`zine-issues:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Valid id query param required.' }, { status: 400 });
  }

  const [deleted] = await database
    .delete(zineIssues)
    .where(eq(zineIssues.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: 'Issue not found.' }, { status: 404 });
  }

  revalidatePath('/issues');
  revalidatePath('/committee/zine-issues');
  return NextResponse.json({ success: true });
}
