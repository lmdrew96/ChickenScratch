import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { notificationFailures } from '@/lib/db/schema';
import { isAdmin } from '@/lib/actions/roles';

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const database = db();

  if (body.all) {
    await database.delete(notificationFailures);
  } else if (body.id) {
    await database.delete(notificationFailures).where(eq(notificationFailures.id, body.id));
  } else {
    return NextResponse.json({ error: 'Missing id or all flag' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
