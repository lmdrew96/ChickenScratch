import { auth, currentUser } from '@clerk/nextjs/server';

import { db } from '@/lib/supabase/db';
import type { Profile } from '@/types/database';

/**
 * Returns the Clerk user ID from the current request, or null if not signed in.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Look up a profile by its clerk_id column.
 */
export async function getProfileByClerkId(clerkId: string): Promise<Profile | null> {
  const supabase = db();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_id', clerkId)
    .maybeSingle();

  if (error) {
    console.error('getProfileByClerkId error:', error);
    return null;
  }
  return data;
}

/**
 * Find-or-create a profile for a Clerk user.
 * On first login after migration, matches by email as a fallback so existing
 * Supabase users get linked to their Clerk account automatically.
 */
export async function ensureProfile(clerkId: string): Promise<Profile | null> {
  // 1. Try direct clerk_id lookup
  const existing = await getProfileByClerkId(clerkId);
  if (existing) return existing;

  // 2. Get Clerk user details for email-matching fallback
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const supabase = db();

  // 3. Try email-matching fallback (migration path for existing Supabase users)
  const { data: emailMatch } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .is('clerk_id', null)
    .maybeSingle();

  if (emailMatch) {
    // Link existing profile to Clerk user
    const { data: updated } = await supabase
      .from('profiles')
      .update({ clerk_id: clerkId })
      .eq('id', emailMatch.id)
      .select('*')
      .single();
    return updated ?? emailMatch;
  }

  // 4. Create new profile
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      id: crypto.randomUUID(),
      email,
      clerk_id: clerkId,
      full_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('ensureProfile insert error:', error);
    return null;
  }
  return created;
}
