'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { roleLandingPath } from '@/lib/auth';
import { logHandledIssue } from '@/lib/logging';
import { getAllowedDomains } from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerActionClient } from '@/lib/supabase/server-action';
import { getEmailDomain } from '@/lib/utils';
import type { Database, Profile } from '@/types/database';
import type { AuthFormState } from './auth-shared';

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

  const supabase = await createSupabaseServerActionClient();
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

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    logHandledIssue('auth:register:service-role', {
      reason: 'Supabase service role client unavailable during registration',
      cause: error,
    });
    return {
      status: 'error',
      message: 'Registration is temporarily unavailable. Ask an administrator to configure the service role key.',
    };
  }
  const existingUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (existingUsers.error) {
    logHandledIssue('auth:register:list-users', {
      reason: 'Failed to list Supabase users during registration',
      cause: existingUsers.error,
    });
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

  const supabase = await createSupabaseServerActionClient();
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
  const supabase = await createSupabaseServerActionClient();
  await supabase.auth.signOut();
  redirect('/login');
}
