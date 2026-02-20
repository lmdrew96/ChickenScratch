import { NextRequest, NextResponse } from 'next/server';

import { checkStaleSubmissions, checkOverdueTasks, checkStaleTasks, checkMeetingResponses } from '@/lib/reminders';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await Promise.allSettled([
    checkStaleSubmissions(),
    checkOverdueTasks(),
    checkStaleTasks(),
    checkMeetingResponses(),
  ]);

  const summary = results.map((r, i) => {
    const labels = ['staleSubmissions', 'overdueTasks', 'staleTasks', 'meetingResponses'];
    return {
      check: labels[i],
      ...(r.status === 'fulfilled' ? r.value : { error: String(r.reason) }),
    };
  });

  console.log('[cron/reminders]', JSON.stringify(summary));

  return NextResponse.json({ ok: true, summary });
}
