import { NextRequest, NextResponse } from 'next/server';
import { ne, inArray, and, lt, isNotNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { officerTasks, profiles } from '@/lib/db/schema';
import { sendDiscordEmbed } from '@/lib/discord';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const database = db();
  const now = new Date();

  const tasks = await database
    .select()
    .from(officerTasks)
    .where(ne(officerTasks.status, 'done'));

  if (tasks.length === 0) {
    console.log('[cron/discord-digest] No open tasks, skipping digest');
    return NextResponse.json({ ok: true, sent: false, reason: 'no open tasks' });
  }

  const overdue = tasks.filter(
    (t) => t.due_date !== null && new Date(t.due_date) < now,
  );
  const open = tasks.filter(
    (t) => t.due_date === null || new Date(t.due_date) >= now,
  );

  // Fetch assignee display names
  const assigneeIds = [
    ...new Set(tasks.map((t) => t.assigned_to).filter((id): id is string => !!id)),
  ];
  const profileRows = assigneeIds.length > 0
    ? await database
        .select({ id: profiles.id, name: profiles.name, full_name: profiles.full_name, email: profiles.email })
        .from(profiles)
        .where(inArray(profiles.id, assigneeIds))
    : [];
  const profileMap = new Map(
    profileRows.map((p) => [p.id, p.name || p.full_name || p.email || 'Unknown']),
  );

  function formatTask(t: typeof tasks[number]): string {
    const assignee = t.assigned_to ? (profileMap.get(t.assigned_to) ?? 'Unassigned') : 'Unassigned';
    return `• ${t.title} (${assignee})`;
  }

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (overdue.length > 0) {
    fields.push({
      name: '🔴 Overdue',
      value: overdue.map(formatTask).join('\n').slice(0, 1024),
      inline: false,
    });
  }

  fields.push({
    name: '📋 Open tasks',
    value: open.length > 0
      ? open.map(formatTask).join('\n').slice(0, 1024)
      : 'No upcoming tasks',
    inline: false,
  });

  const summaryParts = [`${tasks.length} open task${tasks.length !== 1 ? 's' : ''}`];
  if (overdue.length > 0) summaryParts.push(`${overdue.length} overdue`);

  const ok = await sendDiscordEmbed({
    title: 'Weekly Hen & Ink Digest',
    description: summaryParts.join(', '),
    color: 21407, // #00539f
    fields,
    footer: { text: 'Manage tasks at chickenscratch.me/officers' },
    url: 'https://chickenscratch.me/officers',
  });

  console.log('[cron/discord-digest]', { ok, open: open.length, overdue: overdue.length });

  return NextResponse.json({ ok, open: open.length, overdue: overdue.length });
}
