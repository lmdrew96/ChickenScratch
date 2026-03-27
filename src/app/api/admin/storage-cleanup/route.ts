import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

import { isAdmin } from '@/lib/actions/roles';
import { listFiles, deleteFiles } from '@/lib/storage';
import { db } from '@/lib/db';
import { submissions, exhibitionSubmissions } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const BUCKET_PREFIXES = ['art', 'submissions'] as const;
type BucketPrefix = typeof BUCKET_PREFIXES[number];

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const database = db();

    // Collect all known R2 relative paths from the DB
    const [allSubmissions, allExhibition] = await Promise.all([
      database.select({
        file_url: submissions.file_url,
        art_files: submissions.art_files,
        cover_image: submissions.cover_image,
      }).from(submissions),
      database.select({
        file_url: exhibitionSubmissions.file_url,
      }).from(exhibitionSubmissions),
    ]);

    const knownPaths = new Set<string>();
    for (const sub of allSubmissions) {
      if (sub.file_url) knownPaths.add(sub.file_url);
      if (sub.cover_image) knownPaths.add(sub.cover_image);
      const artFiles = sub.art_files as string[] | null;
      if (Array.isArray(artFiles)) artFiles.forEach((p) => knownPaths.add(p));
    }
    for (const ex of allExhibition) {
      if (ex.file_url) knownPaths.add(ex.file_url);
    }

    // List files from both prefixes in parallel
    const [artFiles, submissionFiles] = await Promise.all([
      listFiles('art'),
      listFiles('submissions'),
    ]);

    type OrphanedFile = {
      key: string;
      bucket: BucketPrefix;
      size: number;
      lastModified: string;
    };

    const orphaned: OrphanedFile[] = [];

    for (const f of artFiles) {
      if (!knownPaths.has(f.key)) {
        orphaned.push({ key: f.key, bucket: 'art', size: f.size, lastModified: f.lastModified.toISOString() });
      }
    }
    for (const f of submissionFiles) {
      if (!knownPaths.has(f.key)) {
        orphaned.push({ key: f.key, bucket: 'submissions', size: f.size, lastModified: f.lastModified.toISOString() });
      }
    }

    const totalBytes = orphaned.reduce((sum, f) => sum + f.size, 0);

    return NextResponse.json({
      orphaned,
      totalBytes,
      scannedCount: artFiles.length + submissionFiles.length,
    });
  } catch (error) {
    console.error('[storage-cleanup] GET error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}

const deleteSchema = z.object({
  files: z.array(
    z.object({
      key: z.string().min(1),
      bucket: z.enum(BUCKET_PREFIXES),
    })
  ).min(1).max(500),
});

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Group by bucket prefix for efficient batch delete
    const byBucket = new Map<BucketPrefix, string[]>();
    for (const { key, bucket } of parsed.data.files) {
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket)!.push(key);
    }

    const errors: string[] = [];
    for (const [bucket, keys] of byBucket) {
      const { error } = await deleteFiles(bucket, keys);
      if (error) errors.push(`${bucket}: ${error.message}`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deletedCount: parsed.data.files.length });
  } catch (error) {
    console.error('[storage-cleanup] DELETE error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
