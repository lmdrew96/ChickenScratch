'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { uploadFile, getPublicUrl } from '@/lib/storage';

export async function updateProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const profile = await ensureProfile(userId);
  if (!profile) return { error: 'Profile not found' };

  const name = formData.get('name') as string | null;
  const pronouns = formData.get('pronouns') as string | null;

  try {
    await db()
      .update(profiles)
      .set({
        full_name: name || null,
        pronouns: pronouns || null,
      })
      .where(eq(profiles.id, profile.id));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Update failed' };
  }

  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const profile = await ensureProfile(userId);
  if (!profile) return { error: 'Profile not found' };

  const file = formData.get('avatar') as File | null;
  if (!file) return { error: 'No file provided' };

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${profile.id}/avatar.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await uploadFile('avatars', path, buffer, {
    contentType: file.type || undefined,
    upsert: true,
  });

  if (uploadError) return { error: uploadError.message };

  const avatarUrl = `${getPublicUrl('avatars', path)}?t=${Date.now()}`;

  try {
    await db()
      .update(profiles)
      .set({ avatar_url: avatarUrl })
      .where(eq(profiles.id, profile.id));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update avatar' };
  }

  return { success: true, avatarUrl };
}
