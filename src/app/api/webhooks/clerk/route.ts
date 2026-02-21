import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { eq, and, isNull, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profiles, webhookEvents } from '@/lib/db/schema';

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

  // Idempotency: skip if this event was already processed
  const existing = await database
    .select({ svix_id: webhookEvents.svix_id })
    .from(webhookEvents)
    .where(eq(webhookEvents.svix_id, svixId))
    .limit(1);

  if (existing.length > 0) {
    console.info('[webhook] Skipping duplicate event:', svixId);
    return new Response('OK', { status: 200 });
  }

  // Record event as processed
  await database.insert(webhookEvents).values({ svix_id: svixId });

  const { type, data } = evt;
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address ?? null;
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

  if (type === 'user.created' || type === 'user.updated') {
    // Try to find existing profile by clerk_id
    const existingProfile = await database
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.clerk_id, clerkId))
      .limit(1);

    if (existingProfile[0]) {
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

    console.info('[webhook] Processed', type, { clerkId, email });
  }

  if (type === 'user.deleted') {
    // Soft handling: just clear the clerk_id so the profile is orphaned but data preserved
    await database
      .update(profiles)
      .set({ clerk_id: null })
      .where(eq(profiles.clerk_id, clerkId));

    console.info('[webhook] Processed user.deleted', { clerkId });
  }

  // Opportunistic cleanup: remove webhook events older than 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await database
    .delete(webhookEvents)
    .where(lt(webhookEvents.processed_at, cutoff))
    .catch(() => {}); // Best-effort, don't fail the request

  return new Response('OK', { status: 200 });
}
