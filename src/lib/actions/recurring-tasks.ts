'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { recurringTaskCompletions } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';
import { officerToolkits } from '@/lib/data/toolkits';
import { computeCycleKey, loadCadenceContext } from '@/lib/data/recurring-cycle';

function findTaskCadence(taskId: string): string | null {
  for (const role of officerToolkits) {
    for (const group of role.recurringTasks) {
      if (group.items.some((i) => i.id === taskId)) return group.cadence;
    }
  }
  return null;
}

export async function toggleRecurringTask(taskId: string): Promise<{ ok: true; completed: boolean } | { ok: false; error: string }> {
  try {
    const { profile } = await requireOfficerRole();
    const cadence = findTaskCadence(taskId);
    if (!cadence) return { ok: false, error: 'Unknown task' };

    const ctx = await loadCadenceContext();
    const cycleKey = computeCycleKey(cadence, new Date(), ctx);

    const database = db();
    const existing = await database
      .select({ id: recurringTaskCompletions.id })
      .from(recurringTaskCompletions)
      .where(
        and(
          eq(recurringTaskCompletions.user_id, profile.id),
          eq(recurringTaskCompletions.task_id, taskId),
          eq(recurringTaskCompletions.cycle_key, cycleKey),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await database
        .delete(recurringTaskCompletions)
        .where(eq(recurringTaskCompletions.id, existing[0].id));
      revalidatePath('/officers/toolkits/[slug]', 'page');
      return { ok: true, completed: false };
    }

    await database.insert(recurringTaskCompletions).values({
      user_id: profile.id,
      task_id: taskId,
      cycle_key: cycleKey,
    });
    revalidatePath('/officers/toolkits/[slug]', 'page');
    return { ok: true, completed: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Toggle failed' };
  }
}

export async function getCompletedTaskIds(userId: string, taskIds: string[]): Promise<Set<string>> {
  if (taskIds.length === 0) return new Set();
  const ctx = await loadCadenceContext();
  const cadenceByTask = new Map<string, string>();
  for (const role of officerToolkits) {
    for (const group of role.recurringTasks) {
      for (const item of group.items) {
        if (taskIds.includes(item.id)) cadenceByTask.set(item.id, group.cadence);
      }
    }
  }

  // Collect all cycle_keys we need to filter on, one per distinct cadence present.
  const cycleKeys = new Set<string>();
  for (const cadence of cadenceByTask.values()) {
    cycleKeys.add(computeCycleKey(cadence, new Date(), ctx));
  }
  if (cycleKeys.size === 0) return new Set();

  const rows = await db()
    .select({ task_id: recurringTaskCompletions.task_id, cycle_key: recurringTaskCompletions.cycle_key })
    .from(recurringTaskCompletions)
    .where(
      and(
        eq(recurringTaskCompletions.user_id, userId),
        inArray(recurringTaskCompletions.task_id, taskIds),
        inArray(recurringTaskCompletions.cycle_key, Array.from(cycleKeys)),
      ),
    );

  const completed = new Set<string>();
  for (const row of rows) {
    const expected = cadenceByTask.get(row.task_id);
    if (!expected) continue;
    const expectedKey = computeCycleKey(expected, new Date(), ctx);
    if (row.cycle_key === expectedKey) completed.add(row.task_id);
  }
  return completed;
}
