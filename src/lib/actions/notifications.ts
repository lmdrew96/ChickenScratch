import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { notifications, userRoles, type NotificationType } from '@/lib/db/schema';
import { logNotificationFailure } from '@/lib/email';
import { hasOfficerAccess } from '@/lib/auth/guards';

export async function insertNotification(
  recipientId: string,
  type: NotificationType,
  title: string,
  body?: string | null,
  link?: string | null,
): Promise<void> {
  try {
    await db().insert(notifications).values({
      recipient_id: recipientId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    });
  } catch (err) {
    await logNotificationFailure({
      type: 'committee',
      recipient: recipientId,
      subject: title,
      errorMessage: err instanceof Error ? err.message : String(err),
      context: { type, title },
    }).catch(() => {});
  }
}

export async function insertNotificationsForOfficers(
  excludeUserId: string,
  type: NotificationType,
  title: string,
  body?: string | null,
  link?: string | null,
): Promise<void> {
  try {
    const officerRows = await db()
      .select({ user_id: userRoles.user_id, roles: userRoles.roles, positions: userRoles.positions })
      .from(userRoles);

    const officerIds = officerRows
      .filter((r) => hasOfficerAccess(r.positions as string[], r.roles as string[]))
      .map((r) => r.user_id)
      .filter((id) => id !== excludeUserId);

    await Promise.allSettled(
      officerIds.map((id) => insertNotification(id, type, title, body, link)),
    );
  } catch (err) {
    await logNotificationFailure({
      type: 'officer',
      recipient: 'all-officers',
      subject: title,
      errorMessage: err instanceof Error ? err.message : String(err),
      context: { type, title, excludeUserId },
    }).catch(() => {});
  }
}

export { eq };
