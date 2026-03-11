import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { requireProfile } from '@/lib/auth';
import { WITHDRAWABLE_STATUSES } from '@/lib/constants';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { profile } = await requireProfile();

  const database = db();

  const [submission] = await database
    .select({
      id: submissions.id,
      owner_id: submissions.owner_id,
      status: submissions.status,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  if (submission.owner_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!submission.status || !WITHDRAWABLE_STATUSES.includes(submission.status)) {
    return NextResponse.json(
      { error: 'This submission can no longer be withdrawn.' },
      { status: 409 }
    );
  }

  await database
    .update(submissions)
    .set({ status: 'withdrawn', updated_at: new Date() })
    .where(eq(submissions.id, id));

  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'withdraw',
    details: { previous_status: submission.status },
  });

  revalidatePath('/mine');
  revalidatePath('/editor');
  revalidatePath('/committee');

  return NextResponse.json({ success: true });
}
