# Exhibition Submission Portal — Feature Spec

## Overview

Build an exhibition submission flow for the **May 1st Hen & Ink End-of-Year Exhibition** inside the existing ChickenScratch portal (chickenscratch.me). This is separate from the regular zine submission pipeline — it has its own table, its own routes, and a simple approve/decline review process managed by officers (Nae and Mia).

Exhibition is open to **all AAP students** (account required). Accepted submission types: **writing and visual art**.

---

## Existing Codebase Context

**Stack:** Next.js (App Router), Drizzle ORM, Neon Postgres, Clerk auth, Tailwind CSS, Vercel hosting.

**Relevant existing code to reference for patterns:**
- `src/lib/db/schema.ts` — existing Drizzle schema (profiles, submissions, userRoles, etc.)
- `src/app/submit/page.tsx` — existing zine submission page (use as pattern reference)
- `src/components/forms/submission-form.tsx` — existing submission form component
- `src/lib/constants.ts` — status enums and helpers
- `src/lib/auth/guards.ts` — `requireUser()` auth guard
- `src/lib/storage.ts` — file upload utilities (likely R2/S3)
- `src/lib/notifications.ts` — email notification helpers
- `src/components/navigation/` — PageHeader and nav components
- `src/app/admin/` — existing admin panel (use as pattern for admin views)

---

## Database Schema

Add a new table `exhibition_submissions` to `src/lib/db/schema.ts`. Do NOT modify the existing `submissions` table.

```typescript
export const exhibitionSubmissions = pgTable('exhibition_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner_id: uuid('owner_id').notNull().references(() => profiles.id),
  
  // Submitter info
  preferred_name: text('preferred_name'),
  
  // Piece info
  title: text('title').notNull(),
  type: text('type').notNull(), // 'writing' or 'visual'
  medium: text('medium').notNull(), // poetry, prose, painting, photography, digital_art, mixed_media, other
  description: text('description'), // Brief description of the piece
  artist_statement: text('artist_statement'), // Optional artist statement
  content_warnings: text('content_warnings'),
  
  // Writing-specific
  text_body: text('text_body'), // For writing submissions
  word_count: integer('word_count'),
  
  // Visual art-specific
  file_url: text('file_url'), // Uploaded image/file
  file_name: text('file_name'),
  file_type: text('file_type'),
  file_size: integer('file_size'),
  
  // Physical display needs
  display_format: text('display_format'), // 'print_provided' (submitter prints), 'needs_printing', 'digital_display', 'physical_original'
  display_notes: text('display_notes'), // Size requirements, framing needs, easel needed, etc.
  
  // Review
  status: text('status').default('submitted'), // submitted, approved, declined
  reviewer_id: uuid('reviewer_id').references(() => profiles.id),
  reviewer_notes: text('reviewer_notes'),
  reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
  
  // Metadata
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('exhibition_submissions_owner_id_idx').on(table.owner_id),
  index('exhibition_submissions_status_idx').on(table.status),
]);

export const exhibitionConfig = pgTable('exhibition_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(), // e.g., 'submission_deadline', 'exhibition_date', 'submissions_open'
  value: text('value').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

After adding the schema, run:
```bash
pnpm db:generate
pnpm db:push
```

Seed the `exhibition_config` table with:
- `submission_deadline` → `2026-04-18T23:59:59-04:00` (configurable, default ~2 weeks before exhibition)
- `exhibition_date` → `2026-05-01`
- `submissions_open` → `true`

---

## Routes to Build

### 1. `/exhibition` — Landing Page (public)

A public-facing page explaining the May 1st exhibition. Should include:
- Exhibition title and date (May 1, 2026)
- Brief description of what the exhibition is
- What types of work are accepted (writing and visual art)
- Submission deadline (pulled from `exhibition_config`)
- Whether submissions are currently open or closed
- A prominent "Submit Your Work" CTA button → links to `/exhibition/submit`
- If deadline has passed or submissions are closed, show a "Submissions Closed" message instead of the CTA

**Style:** Match the existing ChickenScratch design language. Keep it inviting — this is a recruitment tool as much as an info page.

### 2. `/exhibition/submit` — Submission Form (auth required)

Protected route using `requireUser('/exhibition/submit')`.

**Form fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Preferred name | text | No | How they want to be credited |
| Title | text | Yes | Title of the piece |
| Type | select | Yes | "Writing" or "Visual Art" |
| Medium | select | Yes | Depends on type (see below) |
| Description | textarea | No | Brief description of the piece |
| Artist statement | textarea | No | Optional, max 500 words |
| Content warnings | text | No | Freeform |
| **If writing:** | | | |
| Text body | textarea/rich text | Yes | The actual writing |
| **If visual art:** | | | |
| File upload | file | Yes | Image upload (jpg, png, pdf). Use existing storage.ts patterns |
| Display format | select | Yes | How they want it displayed |
| Display notes | textarea | No | Size, framing needs, etc. |

**Medium options by type:**
- Writing: Poetry, Prose/Fiction, Creative Nonfiction, Other
- Visual Art: Painting, Drawing, Photography, Digital Art, Mixed Media, Other

**Display format options** (visual art only):
- "I'll bring a printed copy" (`print_provided`)
- "I need it printed" (`needs_printing`)
- "Digital display only" (`digital_display`)
- "I'll bring the physical original" (`physical_original`)

**Behavior:**
- Check `exhibition_config.submissions_open` and `submission_deadline` before showing the form. If closed or past deadline, redirect to `/exhibition` with a toast message.
- On successful submission, show a confirmation message and send a confirmation email (use existing notification patterns).
- Submitters should be able to see their own submissions at `/exhibition/mine` (or add a section to the existing `/mine` page).

### 3. `/admin/exhibition` — Admin Review Panel (officers only)

Accessible to users with officer/admin roles (check existing role patterns in the codebase).

**Features:**
- List all exhibition submissions with status badges (submitted/approved/declined)
- Filter by status, type (writing/visual)
- Click into a submission to see full details
- Approve or decline with optional reviewer notes
- Show submission stats at the top (total, pending review, approved, declined)
- Ability to update the submission deadline and toggle submissions open/closed (edits `exhibition_config`)

**Review detail view** should show:
- All submission info
- The actual text body (for writing) or image preview (for visual art)
- Approve / Decline buttons with an optional notes field
- Status history (when it was submitted, when it was reviewed)

---

## API Routes

Create under `src/app/api/exhibition/`:

- `POST /api/exhibition/submit` — Create new exhibition submission
- `GET /api/exhibition/mine` — Get current user's exhibition submissions
- `GET /api/exhibition/admin` — Get all submissions (officers only)
- `PATCH /api/exhibition/admin/[id]` — Approve/decline a submission (officers only)
- `GET /api/exhibition/config` — Get exhibition config (public)
- `PATCH /api/exhibition/config` — Update config (officers only)

Follow existing API patterns in `src/app/api/` for auth checks, error handling, and response format.

---

## Email Notifications

Using existing email/notification patterns:

1. **Submission confirmation** → sent to submitter when they submit
2. **New submission alert** → sent to officers when a new submission arrives
3. **Decision notification** → sent to submitter when their piece is approved/declined

---

## Important Notes

- Do NOT touch the existing `submissions` table or zine submission flow. This is entirely separate.
- Follow existing code patterns for auth, file uploads, admin access, styling, etc.
- The exhibition_config table makes deadlines and open/closed status configurable from the admin panel — no code changes needed to adjust dates.
- Keep the UI warm and encouraging — this targets AAP students who may not have submitted creative work before.
- The form should be responsive and work well on mobile (students will likely submit from their phones).
