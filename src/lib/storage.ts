import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'art';

export function assertUserOwnsPath(userId: string, path: string) {
  if (!path.startsWith(`${userId}/`)) {
    throw new Error('Invalid file path.');
  }
}

export async function createSignedUrl(path: string, expiresInSeconds = 60 * 60 * 24 * 7) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw error ?? new Error('Unable to create signed URL');
  }
  return data.signedUrl;
}

export async function createSignedUrls(paths: string[]) {
  return Promise.all(paths.map((path) => createSignedUrl(path)));
}

export function getBucketName() {
  return BUCKET;
}
