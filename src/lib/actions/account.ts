'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { uploadFile, getPublicUrl } from '@/lib/storage';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export async function updateProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const profile = await ensureProfile(userId);
  if (!profile) return { error: 'Profile not found' };

  const name = formData.get('name')?.toString() || null;
  const pronouns = formData.get('pronouns')?.toString() || null;

  try {
    await db()
      .update(profiles)
      .set({
        full_name: name || null,
        pronouns: pronouns || null,
        updated_at: new Date(),
      })
      .where(eq(profiles.id, profile.id));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Update failed' };
  }

  revalidatePath('/account');
  revalidatePath('/', 'layout');

  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const profile = await ensureProfile(userId);
  if (!profile) return { error: 'Profile not found' };

  const fileEntry = formData.get('avatar');
  const file = fileEntry instanceof File ? fileEntry : null;
  if (!file) return { error: 'No file provided' };

  // Validate file size
  if (file.size > MAX_AVATAR_SIZE) {
    return { error: 'File too large — maximum size is 5 MB' };
  }

  // Validate file type (reject SVG to prevent XSS)
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Invalid file type — upload a PNG, JPEG, GIF, or WebP image' };
  }

  // Validate extension
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: 'Invalid file extension — use .png, .jpg, .gif, or .webp' };
  }

  const path = `${profile.id}/avatar.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await uploadFile('avatars', path, buffer, {
    contentType: file.type || undefined,
    upsert: true,
  });

  if (uploadError) return { error: uploadError.message };

  // Store clean URL without cache-buster — append ?t= at render time instead
  const avatarUrl = getPublicUrl('avatars', path);

  try {
    await db()
      .update(profiles)
      .set({
        avatar_url: avatarUrl,
        updated_at: new Date(),
      })
      .where(eq(profiles.id, profile.id));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update avatar' };
  }

  revalidatePath('/account');
  revalidatePath('/', 'layout');

  return { success: true, avatarUrl };
}
