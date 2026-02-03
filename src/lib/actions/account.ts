'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/db';
import { ensureProfile } from '@/lib/auth/clerk';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function updateProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const profile = await ensureProfile(userId);
  if (!profile) return { error: 'Profile not found' };

  const name = formData.get('name') as string | null;
  const pronouns = formData.get('pronouns') as string | null;

  const supabase = db();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: name || null,
      pronouns: pronouns || null,
    })
    .eq('id', profile.id);

  if (error) return { error: error.message };
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

  const adminClient = createSupabaseAdminClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await adminClient.storage
    .from('avatars')
    .upload(path, buffer, {
      cacheControl: '0',
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadError) return { error: uploadError.message };

  const pub = adminClient.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${pub.data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', profile.id);

  if (updateError) return { error: updateError.message };
  return { success: true, avatarUrl };
}
