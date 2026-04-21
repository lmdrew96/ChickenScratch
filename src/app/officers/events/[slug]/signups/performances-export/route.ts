import { NextResponse } from 'next/server';

import { requireOfficerRole } from '@/lib/auth/guards';
import {
  getEventBySlug,
  getPerformanceSignupsByEventId,
} from '@/lib/data/event-queries';
import { PERFORMANCE_KIND_LABEL } from '@/lib/validations/event-performance-signup';

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function formatCreatedAt(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
    hour12: false,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  await requireOfficerRole();

  const event = await getEventBySlug(slug);
  if (!event) return new NextResponse('Event not found', { status: 404 });

  const performances = await getPerformanceSignupsByEventId(event.id);

  const header = [
    'Name',
    'Email',
    'Type',
    'Piece title',
    'Estimated minutes',
    'Content warnings',
    'Notes',
    'Submitted (ET)',
  ];
  const rows = performances.map((p) => [
    p.name,
    p.email,
    PERFORMANCE_KIND_LABEL[p.kind],
    p.piece_title,
    String(p.estimated_minutes),
    p.content_warnings ?? '',
    p.notes ?? '',
    formatCreatedAt(p.created_at),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(','))
    .join('\r\n');

  const filename = `${event.slug}-performances-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
