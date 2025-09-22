import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

import type { Database } from '@/types/database';

const BUCKET = 'art';

let cachedAdminClient: SupabaseClient<Database> | null = null;
let attemptedAdminClientInitialization = false;

export function assertUserOwnsPath(userId: string, path: string) {
  if (!path.startsWith(`${userId}/`)) {
    throw new Error('Invalid file path.');
  }
}

function getAdminClient(): SupabaseClient<Database> | null {
  if (!attemptedAdminClientInitialization) {
    attemptedAdminClientInitialization = true;
    try {
      cachedAdminClient = createSupabaseAdminClient();
    } catch (error) {
      cachedAdminClient = null;
      console.warn(
        'Supabase service role key missing or invalid. Signed URLs will be skipped until it is configured.',
        error
      );
    }
  }

  return cachedAdminClient;
}

export async function createSignedUrl(
  path: string,
  expiresInSeconds = 60 * 60 * 24 * 7
): Promise<string | null> {
  const supabase = getAdminClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      console.warn('Unable to create signed URL for path', path, error);
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    console.warn('Failed to create signed URL for path', path, error);
    return null;
  }
}

export async function createSignedUrls(paths: string[], expiresInSeconds = 60 * 60 * 24 * 7) {
  return Promise.all(
    paths.map(async (path) => ({
      path,
      signedUrl: await createSignedUrl(path, expiresInSeconds),
    }))
  );
}

export function getBucketName() {
  return BUCKET;
}
