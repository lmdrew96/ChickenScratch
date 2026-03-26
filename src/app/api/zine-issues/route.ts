import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { zineIssues, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';
import { uploadFile, getPublicUrl } from '@/lib/storage';

const ZINES_BUCKET = 'zines';
const PDF_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

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

async function uploadPdf(file: File): Promise<{ url: string } | { error: string }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { error: 'Only PDF files are accepted.' };
  }
  if (file.size > PDF_MAX_BYTES) {
    return { error: 'PDF must be under 50 MB.' };
  }
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${Date.now()}-${sanitizedName}`;
  const { error: uploadError } = await uploadFile(ZINES_BUCKET, filePath, file, {
    contentType: 'application/pdf',
  });
  if (uploadError) return { error: 'PDF upload failed.' };
  return { url: getPublicUrl(ZINES_BUCKET, filePath) };
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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const title = formData.get('title')?.toString().trim() ?? '';
  if (!title) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const volumeRaw = formData.get('volume')?.toString();
  const issueNumberRaw = formData.get('issue_number')?.toString();
  const publishDateRaw = formData.get('publish_date')?.toString();
  const isPublished = formData.get('is_published')?.toString() === 'true';
  const pdfFile = formData.get('pdf') instanceof File ? (formData.get('pdf') as File) : null;

  let pdf_url: string | null = null;
  if (pdfFile && pdfFile.size > 0) {
    const result = await uploadPdf(pdfFile);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    pdf_url = result.url;
  }

  const [issue] = await database
    .insert(zineIssues)
    .values({
      title,
      volume: volumeRaw ? parseInt(volumeRaw, 10) : null,
      issue_number: issueNumberRaw ? parseInt(issueNumberRaw, 10) : null,
      publish_date: publishDateRaw ? new Date(publishDateRaw) : null,
      pdf_url,
      is_published: isPublished,
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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const id = formData.get('id')?.toString();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Valid id is required.' }, { status: 400 });
  }

  const title = formData.get('title')?.toString().trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const volumeRaw = formData.get('volume')?.toString();
  const issueNumberRaw = formData.get('issue_number')?.toString();
  const publishDateRaw = formData.get('publish_date')?.toString();
  const isPublishedRaw = formData.get('is_published')?.toString();
  const pdfFile = formData.get('pdf') instanceof File ? (formData.get('pdf') as File) : null;

  const updatePayload: Record<string, unknown> = {
    title,
    volume: volumeRaw ? parseInt(volumeRaw, 10) : null,
    issue_number: issueNumberRaw ? parseInt(issueNumberRaw, 10) : null,
    publish_date: publishDateRaw ? new Date(publishDateRaw) : null,
    is_published: isPublishedRaw === 'true',
  };

  if (pdfFile && pdfFile.size > 0) {
    const result = await uploadPdf(pdfFile);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    updatePayload.pdf_url = result.url;
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
