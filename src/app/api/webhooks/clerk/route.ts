import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { eq, and, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.text();

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const database = db();
  const { type, data } = evt;
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address ?? null;
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

  if (type === 'user.created' || type === 'user.updated') {
    // Try to find existing profile by clerk_id
    const existing = await database
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.clerk_id, clerkId))
      .limit(1);

    if (existing[0]) {
      // Update existing profile
      await database
        .update(profiles)
        .set({
          email,
          full_name: fullName,
          name: fullName,
        })
        .where(eq(profiles.clerk_id, clerkId));
    } else if (email) {
      // Try email-matching fallback for migration
      const emailMatch = await database
        .select({ id: profiles.id })
        .from(profiles)
        .where(and(eq(profiles.email, email), isNull(profiles.clerk_id)))
        .limit(1);

      if (emailMatch[0]) {
        await database
          .update(profiles)
          .set({ clerk_id: clerkId, full_name: fullName, name: fullName })
          .where(eq(profiles.id, emailMatch[0].id));
      } else {
        // Create new profile
        await database.insert(profiles).values({
          id: crypto.randomUUID(),
          email,
          clerk_id: clerkId,
          full_name: fullName,
          name: fullName,
        });
      }
    }
  }

  if (type === 'user.deleted') {
    // Soft handling: just clear the clerk_id so the profile is orphaned but data preserved
    await database
      .update(profiles)
      .set({ clerk_id: null })
      .where(eq(profiles.clerk_id, clerkId));
  }

  return new Response('OK', { status: 200 });
}
