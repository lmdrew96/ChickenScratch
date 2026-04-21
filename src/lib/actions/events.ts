'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';

import { db } from '@/lib/db';
import { events, eventSignups, eventPerformanceSignups } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';
import { notifyNewEventSignup, notifyNewPerformanceSignup } from '@/lib/discord';
import { sendSignupConfirmationEmail, sendPerformanceConfirmationEmail } from '@/lib/email';
import { getEventBySlug, isSignupsEffectivelyOpen } from '@/lib/data/event-queries';
import { signupSchema, type SignupInput } from '@/lib/validations/event-signup';
import {
  performanceSignupSchema,
  type PerformanceSignupInput,
} from '@/lib/validations/event-performance-signup';

export type SignupResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof SignupInput, string>> };

function flattenFieldErrors(
  err: z.ZodError<SignupInput>,
): Partial<Record<keyof SignupInput, string>> {
  const out: Partial<Record<keyof SignupInput, string>> = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof SignupInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function submitSignup(
  slug: string,
  rawInput: Record<string, unknown>,
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the fields below and try again.',
      fieldErrors: flattenFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  const event = await getEventBySlug(slug);
  if (!event) return { ok: false, error: 'Event not found.' };
  if (!isSignupsEffectivelyOpen(event)) {
    return { ok: false, error: 'Signups for this event are closed.' };
  }

  try {
    await db().insert(eventSignups).values({
      event_id: event.id,
      name: input.name,
      email: input.email,
      item: input.item,
      category: input.category,
      notes: input.notes ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Postgres unique_violation code is 23505.
    if (message.includes('event_signups_event_email_unique') || message.includes('23505')) {
      return {
        ok: false,
        error: "You've already signed up for this event. Reach out to an officer if you need to change your entry.",
        fieldErrors: { email: 'This email is already signed up.' },
      };
    }
    return { ok: false, error: 'Something went wrong saving your signup. Please try again.' };
  }

  // Notifications are best-effort — never block the signup.
  try {
    await notifyNewEventSignup(
      { name: input.name, item: input.item, category: input.category, notes: input.notes ?? null },
      { slug: event.slug, name: event.name },
    );
  } catch (err) {
    console.error('[events] Discord notify failed:', err);
  }
  try {
    await sendSignupConfirmationEmail({
      to: input.email,
      name: input.name,
      item: input.item,
      category: input.category,
      notes: input.notes ?? null,
      event,
    });
  } catch (err) {
    console.error('[events] Confirmation email failed:', err);
  }

  revalidatePath(`/events/${slug}`);
  revalidatePath(`/officers/events/${slug}/signups`);
  revalidatePath('/officers/events');
  return { ok: true };
}

export async function deleteSignup(signupId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    const deleted = await db()
      .delete(eventSignups)
      .where(eq(eventSignups.id, signupId))
      .returning({ event_id: eventSignups.event_id });
    const eventId = deleted[0]?.event_id;
    if (eventId) {
      const eventRows = await db().select({ slug: events.slug }).from(events).where(eq(events.id, eventId)).limit(1);
      const slug = eventRows[0]?.slug;
      if (slug) {
        revalidatePath(`/events/${slug}`);
        revalidatePath(`/officers/events/${slug}/signups`);
      }
    }
    revalidatePath('/officers/events');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function toggleSignupsOpen(
  eventId: string,
  open: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    const updated = await db()
      .update(events)
      .set({ signups_open: open, updated_at: new Date() })
      .where(eq(events.id, eventId))
      .returning({ slug: events.slug });
    const slug = updated[0]?.slug;
    if (slug) {
      revalidatePath(`/events/${slug}`);
      revalidatePath(`/officers/events/${slug}/signups`);
    }
    revalidatePath('/officers/events');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export type PerformanceSignupResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof PerformanceSignupInput, string>>;
    };

function flattenPerformanceFieldErrors(
  err: z.ZodError<PerformanceSignupInput>,
): Partial<Record<keyof PerformanceSignupInput, string>> {
  const out: Partial<Record<keyof PerformanceSignupInput, string>> = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof PerformanceSignupInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function submitPerformanceSignup(
  slug: string,
  rawInput: Record<string, unknown>,
): Promise<PerformanceSignupResult> {
  const parsed = performanceSignupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the fields below and try again.',
      fieldErrors: flattenPerformanceFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  const event = await getEventBySlug(slug);
  if (!event) return { ok: false, error: 'Event not found.' };
  if (!isSignupsEffectivelyOpen(event)) {
    return { ok: false, error: 'Signups for this event are closed.' };
  }

  try {
    await db().insert(eventPerformanceSignups).values({
      event_id: event.id,
      name: input.name,
      email: input.email,
      kind: input.kind,
      piece_title: input.piece_title,
      estimated_minutes: input.estimated_minutes,
      content_warnings: input.content_warnings ?? null,
      notes: input.notes ?? null,
    });
  } catch (err) {
    console.error('[events] Failed to save performance signup:', err);
    return { ok: false, error: 'Something went wrong saving your signup. Please try again.' };
  }

  // Notifications are best-effort — never block the signup.
  try {
    await notifyNewPerformanceSignup(
      {
        name: input.name,
        kind: input.kind,
        piece_title: input.piece_title,
        estimated_minutes: input.estimated_minutes,
        content_warnings: input.content_warnings ?? null,
        notes: input.notes ?? null,
      },
      { slug: event.slug, name: event.name },
    );
  } catch (err) {
    console.error('[events] Discord notify (performance) failed:', err);
  }
  try {
    await sendPerformanceConfirmationEmail({
      to: input.email,
      name: input.name,
      kind: input.kind,
      piece_title: input.piece_title,
      estimated_minutes: input.estimated_minutes,
      content_warnings: input.content_warnings ?? null,
      notes: input.notes ?? null,
      event,
    });
  } catch (err) {
    console.error('[events] Performance confirmation email failed:', err);
  }

  revalidatePath(`/events/${slug}`);
  revalidatePath(`/officers/events/${slug}/signups`);
  revalidatePath('/officers/events');
  return { ok: true };
}

export async function deletePerformanceSignup(
  signupId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    const deleted = await db()
      .delete(eventPerformanceSignups)
      .where(eq(eventPerformanceSignups.id, signupId))
      .returning({ event_id: eventPerformanceSignups.event_id });
    const eventId = deleted[0]?.event_id;
    if (eventId) {
      const eventRows = await db()
        .select({ slug: events.slug })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      const slug = eventRows[0]?.slug;
      if (slug) {
        revalidatePath(`/events/${slug}`);
        revalidatePath(`/officers/events/${slug}/signups`);
      }
    }
    revalidatePath('/officers/events');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
