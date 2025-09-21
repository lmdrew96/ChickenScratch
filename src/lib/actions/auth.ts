'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { roleLandingPath } from '@/lib/auth';
import { getAllowedDomains } from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEmailDomain } from '@/lib/utils';
import type { Database, Profile } from '@/types/database';

export type AuthFormState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
};

export const authInitialState: AuthFormState = { status: 'idle' };

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = signInSchema.extend({
  name: z.string().min(2, 'Name is required'),
});

export async function signInAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: Object.values(parsed.error.flatten().fieldErrors).flat().join(', '),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return {
      status: 'error',
      message: error?.message ?? 'Unable to sign in. Please verify your credentials.',
    };
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  const profile = profileData as Pick<Profile, 'role'> | null;

  redirect(roleLandingPath(profile?.role ?? 'student'));
}

export async function registerAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: Object.values(parsed.error.flatten().fieldErrors).flat().join(', '),
    };
  }

  const allowedDomains = getAllowedDomains();
  const domain = getEmailDomain(parsed.data.email);
  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    return {
      status: 'error',
      message: `Chicken Scratch is limited to ${allowedDomains.join(', ')} addresses.`,
    };
  }

  const admin = createSupabaseAdminClient();
  const existingUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (existingUsers.error) {
    console.error('Failed to list users when registering', existingUsers.error);
    return {
      status: 'error',
      message: 'Unable to validate your account at this time. Please try again.',
    };
  }

  const alreadyExists = existingUsers.data.users.some(
    (user) => user.email?.toLowerCase() === parsed.data.email.toLowerCase()
  );

  if (alreadyExists) {
    return { status: 'error', message: 'Account already exists. Try signing in instead.' };
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    user_metadata: { name: parsed.data.name },
    email_confirm: true,
  });

  if (createError) {
    return { status: 'error', message: createError.message };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      status: 'success',
      message:
        'Account created. Please verify your email inbox if confirmation is required before signing in.',
    };
  }

  const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
    name: parsed.data.name,
  };

  await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id);

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  const profile = profileData as Pick<Profile, 'role'> | null;

  redirect(roleLandingPath(profile?.role ?? 'student'));
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
