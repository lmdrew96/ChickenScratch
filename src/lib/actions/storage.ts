'use server';

import { auth } from '@clerk/nextjs/server';
import { createSignedUrl } from '@/lib/storage';

export async function getSignedDownloadUrl(
  path: string,
  bucket: string = 'art'
): Promise<{ signedUrl: string | null; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { signedUrl: null, error: 'Not authenticated' };

  const signedUrl = await createSignedUrl(path, 60 * 30, bucket);
  if (!signedUrl) return { signedUrl: null, error: 'Unable to generate download link.' };

  return { signedUrl };
}
