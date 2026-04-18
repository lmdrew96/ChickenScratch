'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { meetingAttendance } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';
import type { AttendanceStatus } from '@/lib/data/attendance-queries';

export async function recordAttendance(input: {
  meeting_id: string;
  entries: Array<{ member_id: string; status: AttendanceStatus }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { profile } = await requireOfficerRole();
    if (!input.meeting_id || !Array.isArray(input.entries)) {
      return { ok: false, error: 'Invalid attendance payload' };
    }
    const database = db();
    for (const entry of input.entries) {
      if (!['present', 'absent', 'excused'].includes(entry.status)) continue;
      const existing = await database
        .select({ id: meetingAttendance.id })
        .from(meetingAttendance)
        .where(
          and(
            eq(meetingAttendance.meeting_id, input.meeting_id),
            eq(meetingAttendance.member_id, entry.member_id),
          ),
        )
        .limit(1);
      if (existing[0]) {
        await database
          .update(meetingAttendance)
          .set({
            status: entry.status,
            recorded_at: new Date(),
            recorded_by: profile.id,
          })
          .where(eq(meetingAttendance.id, existing[0].id));
      } else {
        await database.insert(meetingAttendance).values({
          meeting_id: input.meeting_id,
          member_id: entry.member_id,
          status: entry.status,
          recorded_by: profile.id,
        });
      }
    }
    revalidatePath('/officers/toolkits/secretary');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Record failed' };
  }
}
