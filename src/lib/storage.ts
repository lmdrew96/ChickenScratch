import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@/lib/env';

const ART_BUCKET = 'art';
const SUBMISSIONS_BUCKET = 'submissions';

let cachedS3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return cachedS3Client;
}

/** Build the full R2 object key: `{bucket}/{path}` */
function objectKey(bucket: string, path: string): string {
  return `${bucket}/${path}`;
}

export function assertUserOwnsPath(userId: string, path: string) {
  if (!path.startsWith(`${userId}/`)) {
    throw new Error('Invalid file path.');
  }
}

export async function createSignedUrl(
  path: string,
  expiresInSeconds = 60 * 60 * 24 * 7,
  bucket: string = ART_BUCKET
): Promise<string | null> {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey(bucket, path),
    });
    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    console.warn('Failed to create signed URL for path', path, error);
    return null;
  }
}

export async function createSignedUrls(
  paths: string[],
  expiresInSeconds = 60 * 60 * 24 * 7,
  bucket: string = ART_BUCKET
) {
  return Promise.all(
    paths.map(async (path) => ({
      path,
      signedUrl: await createSignedUrl(path, expiresInSeconds, bucket),
    }))
  );
}

export function getBucketName() {
  return ART_BUCKET;
}

export function getSubmissionsBucketName() {
  return SUBMISSIONS_BUCKET;
}

export function getPublicUrl(bucket: string, path: string): string {
  return `${env.R2_PUBLIC_URL}/${objectKey(bucket, path)}`;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Buffer,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ path: string; error: Error | null }> {
  try {
    const client = getS3Client();
    const body = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: objectKey(bucket, path),
        Body: body,
        ContentType: options?.contentType ?? (file instanceof File ? file.type : undefined),
        CacheControl: 'max-age=3600',
      })
    );

    return { path, error: null };
  } catch (error) {
    return { path: '', error: error as Error };
  }
}

export async function deleteFiles(
  bucket: string,
  paths: string[]
): Promise<{ error: Error | null }> {
  if (paths.length === 0) return { error: null };

  try {
    const client = getS3Client();
    await client.send(
      new DeleteObjectsCommand({
        Bucket: env.R2_BUCKET_NAME,
        Delete: {
          Objects: paths.map((p) => ({ Key: objectKey(bucket, p) })),
        },
      })
    );
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
