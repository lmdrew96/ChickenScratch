import { auth, currentUser } from '@clerk/nextjs/server';
import { eq, and, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
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
  try {
    const result = await db()
      .select()
      .from(profiles)
      .where(eq(profiles.clerk_id, clerkId))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    console.error('getProfileByClerkId error:', error);
    return null;
  }
}

/**
 * Find-or-create a profile for a Clerk user.
 * On first login after migration, matches by email as a fallback so existing
 * users get linked to their Clerk account automatically.
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

  const database = db();

  // 3. Try email-matching fallback (migration path for existing users)
  const emailMatch = await database
    .select()
    .from(profiles)
    .where(and(eq(profiles.email, email), isNull(profiles.clerk_id)))
    .limit(1);

  if (emailMatch[0]) {
    // Link existing profile to Clerk user
    const updated = await database
      .update(profiles)
      .set({ clerk_id: clerkId })
      .where(eq(profiles.id, emailMatch[0].id))
      .returning();
    return updated[0] ?? emailMatch[0];
  }

  // 4. Create new profile
  try {
    const created = await database
      .insert(profiles)
      .values({
        id: crypto.randomUUID(),
        email,
        clerk_id: clerkId,
        full_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      })
      .returning();

    return created[0] ?? null;
  } catch (error) {
    console.error('ensureProfile insert error:', error);
    return null;
  }
}
