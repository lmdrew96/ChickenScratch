# Task: Event Signup System (Flock Party MVP)

## 🎯 Context & Goal

Build a **reusable event signup system** on chickenscratch.me, with the Flock Party potluck as the first consumer. The architecture should support any future Hen & Ink event (Next Stop Newark tabling, bookmark-making nights, writing workshops, etc.) by swapping the event slug.

No Clerk auth required for public signups — just a validated `@udel.edu` email. Admin views use the existing officer-level permission check.

## 🧱 Tech Stack Recap

- Next.js App Router + TypeScript
- Drizzle ORM + PostgreSQL (Vercel Postgres)
- Clerk (admin routes only)
- Resend (confirmation emails) — already wired in `lib/email/`
- Discord webhook (notifications) — already wired in `lib/officer-notifications.ts`
- Tailwind + shadcn/ui for form components
- Brand colors: `#FFD200` (Ink Gold), `#00539F` (Hen Blue)
- JSX apostrophes encode as `&apos;`

---

## 🗄️ Schema Changes

### New table: `events`

```ts
// db/schema/events.ts
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // e.g. "flock-party-2026-05"
  name: text('name').notNull(),          // e.g. "Flock Party"
  description: text('description'),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  location: text('location'),
  signupsOpen: boolean('signups_open').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### New table: `event_signups`

```ts
// db/schema/event-signups.ts
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { events } from './events';

export const signupCategoryEnum = pgEnum('signup_category', [
  'sweet',
  'savory',
  'drink',
  'utensils',
  'other',
]);

export const eventSignups = pgTable('event_signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(), // @udel.edu enforced in validation
  item: text('item').notNull(),
  category: signupCategoryEnum('category').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Unique constraint: one signup per email per event (prevents dupes)
// Add via migration: UNIQUE (event_id, lower(email))
```

### Migration notes

- Use `drizzle-kit generate` → review → `drizzle-kit migrate`
- Add the unique constraint on `(event_id, lower(email))` via raw SQL in the migration — prevents one person from double-submitting by changing email casing.
- Seed the Flock Party event (see Phase 5).

---

## 🛣️ Route Structure

### Public: `/events/[slug]`

Server component that:
1. Fetches the event by slug (404 if not found or `signupsOpen = false` and event is past)
2. Fetches all signups grouped by category
3. Renders: event header + signup form (client component) + live list of what&apos;s claimed

### Admin: `/admin/events` and `/admin/events/[slug]/signups`

Gated behind existing officer-level auth check (whatever `requireOfficerRole` / `hasOfficerAccess` equivalent lives in the codebase — use the officer tier, NOT the editor tier, since this is club ops, not editorial work).

- `/admin/events` — list all events, link to signup management, "Create event" button (stretch)
- `/admin/events/[slug]/signups` — full signup table with:
  - Name, email, item, category, notes, timestamp
  - Delete button per row
  - Toggle `signupsOpen` for the event
  - CSV export button

---

## ✅ Implementation Checklist

### Phase 1: Schema & Infrastructure

- [ ] Add `events` table schema
- [ ] Add `event_signups` table schema with enum
- [ ] Generate + review migration
- [ ] Add unique constraint on `(event_id, lower(email))` in migration SQL
- [ ] Run migration
- [ ] Add Drizzle query helpers in `lib/db/queries/events.ts`:
  - `getEventBySlug(slug: string)`
  - `getSignupsByEventId(eventId: string)`
  - `createSignup(data: NewSignup)`
  - `deleteSignup(id: string)`
  - `toggleSignupsOpen(eventId: string, open: boolean)`

### Phase 2: Public Signup Form

- [ ] Create Zod schema in `lib/validations/event-signup.ts`:
  ```ts
  const UDEL_EMAIL = /^[^\s@]+@udel\.edu$/i;
  export const signupSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().regex(UDEL_EMAIL, {
      message: 'Must be a valid @udel.edu email',
    }),
    item: z.string().trim().min(1).max(200),
    category: z.enum(['sweet', 'savory', 'drink', 'utensils', 'other']),
    notes: z.string().trim().max(500).optional(),
    honeypot: z.string().max(0), // bot trap; real users leave empty
  });
  ```
- [ ] Build server action `submitSignup` in `app/events/[slug]/actions.ts`:
  - Re-validate with Zod (never trust client)
  - Check event exists and `signupsOpen = true`
  - Insert signup (unique constraint handles dupes gracefully)
  - Fire Discord webhook (Phase 3)
  - Send Resend confirmation email (Phase 3)
  - Return `{ success: true }` or `{ error: string }`
- [ ] Build `app/events/[slug]/page.tsx` (server component)
- [ ] Build `components/events/signup-form.tsx` (client component)
  - Uses `react-hook-form` + `zodResolver` (match existing form patterns in repo)
  - Honeypot field (hidden via CSS, `tabIndex={-1}`, `autoComplete="off"`)
  - Loading state, success toast, error handling
  - After success: call `router.refresh()` so new signup appears in the list
- [ ] Build `components/events/signup-list.tsx`:
  - Group by category with section headers (Sweet, Savory, Drinks, Utensils, Other)
  - Show: Name + Item + (optional notes)
  - **NEVER display email publicly**
  - Empty state: "Be the first to sign up!"

### Phase 3: Notifications

**Discord webhook** — extend existing pattern in `lib/officer-notifications.ts`:

```ts
export async function notifyNewSignup(signup: EventSignup, event: Event) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return; // fail silent in dev

  const embed = {
    title: `🐔 New signup for ${event.name}!`,
    description: `**${signup.name}** is bringing **${signup.item}** _(${signup.category})_`,
    color: 0x00539F, // Hen Blue
    fields: signup.notes
      ? [{ name: 'Notes', value: signup.notes }]
      : [],
    footer: { text: 'chickenscratch.me' },
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
```

- [ ] Add `notifyNewSignup` to `lib/officer-notifications.ts`
- [ ] Call it from the `submitSignup` server action (awaited, but wrap in try/catch — a failed webhook should NOT block the signup)

**Resend confirmation email** — add to `lib/email/`:

- [ ] Create `lib/email/templates/signup-confirmation.tsx` (React Email template)
  - Subject: `🐔 You're signed up for the Flock Party!`
  - Body: confirms item + category, event date + location, link back to `/events/[slug]` to see the full list
  - Branded with `#FFD200` header, `#00539F` accents
  - Use the existing News Cycle font fallback stack
- [ ] Call from `submitSignup` after successful insert, wrapped in try/catch

### Phase 4: Admin View

- [ ] Build `/admin/events/page.tsx` — list events with signup counts
- [ ] Build `/admin/events/[slug]/signups/page.tsx` — signup table
- [ ] Server action `deleteSignup(id)` — officer auth required
- [ ] Server action `toggleSignupsOpen(eventId, open)` — officer auth required
- [ ] CSV export route `/admin/events/[slug]/signups/export` — returns `text/csv`
- [ ] Show delete confirmations (use existing AlertDialog pattern)

### Phase 5: Seed Flock Party Event

- [ ] Add seed script at `scripts/seed-flock-party.ts`:
  ```ts
  await db.insert(events).values({
    slug: 'flock-party-2026-05',
    name: 'Flock Party',
    description: 'Our end-of-semester creative celebration! ...',
    eventDate: new Date('2026-05-01T17:00:00-04:00'), // CONFIRM DATE/TIME WITH NAE
    location: 'TBD — Georgetown campus',
    signupsOpen: true,
  });
  ```
- [ ] Run seed script
- [ ] Verify at `/events/flock-party-2026-05`

---

## 🔒 Validation Rules (summary)

| Field | Rule |
|---|---|
| `name` | trim, 1–100 chars, required |
| `email` | `/^[^\s@]+@udel\.edu$/i`, lowercased on save, required |
| `item` | trim, 1–200 chars, required |
| `category` | enum check, required |
| `notes` | trim, 0–500 chars, optional |
| `honeypot` | must be empty string; reject if filled |

Server-side MUST re-validate everything. Client-side validation is UX only.

---

## 🎨 Design Notes

- **Mobile-first.** Form should be thumb-friendly — min 44px tap targets, category as a select or radio group (not a dropdown buried in a menu).
- **Brand consistency:**
  - Page header: Hen Blue (`#00539F`) with Ink Gold (`#FFD200`) accent line
  - Submit button: Ink Gold background, Hen Blue text, hover darkens slightly
  - Category tags in the list: colored dots (sweet=pink, savory=orange, drink=blue, utensils=gray, other=purple) so the balance is visible at a glance
- **Section anchor comments** in JSX for navigation: `{/* Event Header */}`, `{/* Signup Form */}`, `{/* Signup List */}`, `{/* Category Section: Sweet */}`, etc.
- **Empty states matter** — "No sweets yet. Someone grab the cookies!" is better than a blank section.
- **Loading skeleton** for the signup list on initial load.
- **Success state** after submit: toast + form resets + scroll to the new entry in the list.

---

## 🚫 Out of Scope (for now)

- Slot-claiming / capacity limits per category (we want free-bring)
- RSVP (attendance tracking separate from what you're bringing)
- Editing a signup after submission (delete-and-resubmit works for MVP)
- Multi-item submissions in one form (one item per submission)
- Admin UI to create new events (do it via seed script or direct DB for now)
- Email verification (valid `@udel.edu` format is enough; we're not sending magic links)

---

## ❓ Questions to Confirm with Nae Before Starting

1. **Event date/time** — May 1, 2026 is noted in the agenda, but what time? Venue?
2. **Officer auth helper name** — what&apos;s the current function name for officer-level access in the codebase? (Not `hasEditorAccess` — the officer tier.)
3. **Should signups auto-close** when `eventDate` passes, or only when manually toggled?
4. **Discord channel** — is the existing `DISCORD_WEBHOOK_URL` pointing to the right channel for signup notifications, or does this need its own webhook?

---

## 📦 Deliverable

A PR against `lmdrew96/chickenscratch` with:
- Migration + schema files
- Public route at `/events/[slug]`
- Admin routes at `/admin/events` and `/admin/events/[slug]/signups`
- Discord webhook integration
- Resend confirmation email
- Seed script for Flock Party
- Updated README section documenting the event signup pattern for future events
