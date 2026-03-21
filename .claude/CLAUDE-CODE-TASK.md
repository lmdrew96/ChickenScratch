# Discord Webhook Integration — Claude Code Task

## Context

ChickenScratch (https://chickenscratch.me) is the internal portal for Hen & Ink, a literary society RSO at the University of Delaware. It's a Next.js app hosted on Vercel with Neon Postgres (Drizzle ORM), Clerk auth, Cloudflare R2 storage, and Resend for email notifications.

**The problem:** Officers aren't checking email or the Chicken Scratch site regularly. Discord is where everyone actually communicates. We need Chicken Scratch to automatically post to Discord when important things happen (tasks created, announcements posted, meetings proposed), plus a weekly digest of open tasks.

**The existing notification system** (`src/lib/officer-notifications.ts`) already sends branded HTML emails via Resend when announcements or meetings are posted. The new Discord integration should mirror this pattern — same events, same error handling philosophy, different delivery channel.

## What to build

### Part 1: `src/lib/discord.ts` — Discord webhook utility

Create a new file with the following functions:

#### `sendDiscordEmbed(embed: DiscordEmbed): Promise<boolean>`
Low-level function that POSTs to the `DISCORD_WEBHOOK_URL` env var.

```typescript
// Discord webhook payload shape
interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number; // Decimal color value
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  url?: string;
  timestamp?: string; // ISO 8601
}
```

- POST to `process.env.DISCORD_WEBHOOK_URL`
- Body: `{ embeds: [embed] }`
- Headers: `{ 'Content-Type': 'application/json' }`
- If `DISCORD_WEBHOOK_URL` is not set, log a message and return true (same as Resend pattern)
- On failure, log the error using the same pattern as `logNotificationFailure` in `src/lib/email.ts`
- Never throw — return false on failure

#### `notifyDiscordTaskCreated(task, assigneeName?, creatorName?)`
Formats and sends a task creation embed:

```
Color: #00539f (brand blue, as decimal: 21407)
Title: "New Task Created"
Fields:
  - Title: task.title
  - Priority: task.priority (with emoji: high=🔴, medium=🟡, low=🟢)
  - Assigned to: assigneeName or "Unassigned"
  - Due: formatted date or "No due date"
  - Created by: creatorName
Footer: "Chicken Scratch • chickenscratch.me/officers"
URL: "https://chickenscratch.me/officers"
```

#### `notifyDiscordAnnouncement(message, authorName)`
Formats and sends an announcement embed:

```
Color: #ffd200 (accent gold, as decimal: 16765440)
Title: "Officer Announcement"
Description: message (truncated to 2048 chars — Discord limit)
Footer: "Posted by {authorName} • Chicken Scratch"
URL: "https://chickenscratch.me/officers"
```

#### `notifyDiscordMeeting(title, description, proposedDates, authorName)`
Formats and sends a meeting proposal embed:

```
Color: #00539f (brand blue)
Title: "New Meeting Proposal: {title}"
Description: description (if provided)
Fields:
  - Proposed times: formatted list of dates
Footer: "Proposed by {authorName} • Mark availability at chickenscratch.me/officers"
URL: "https://chickenscratch.me/officers"
```

### Part 2: Hook into existing routes

#### `src/app/api/officer/tasks/route.ts`
In the POST handler, after the successful `database.insert(officerTasks)...returning()` call (around line ~100), add a fire-and-forget Discord notification:

```typescript
// After: const task = result[0];
// Add (don't await — fire and forget):
notifyDiscordTaskCreated(
  task,
  task.assigned_to ? /* look up assignee name from profileMap or do a quick query */ : undefined,
  profile.name || profile.full_name || profile.email
).catch(() => {}); // swallow — never block the response
```

Note: You'll need to resolve the assignee's display name. You can either:
- Do a quick profile lookup if `task.assigned_to` exists, OR
- Restructure slightly to have the name available from the request body

The simpler approach is a quick lookup since this is fire-and-forget anyway.

#### `src/lib/officer-notifications.ts`
In `notifyOfficersOfAnnouncement()`, after the Resend email send (successful or not), add:

```typescript
// After the email send block, before the return:
notifyDiscordAnnouncement(message, authorName).catch(() => {});
```

Same pattern in `notifyOfficersOfMeeting()`:

```typescript
notifyDiscordMeeting(title, description, proposedDates, authorName).catch(() => {});
```

### Part 3: Weekly digest cron — `src/app/api/cron/discord-digest/route.ts`

New GET endpoint protected by CRON_SECRET (see existing pattern in `src/app/api/cron/reminders/route.ts`).

**Logic:**
1. Verify `Authorization: Bearer {CRON_SECRET}` header
2. Query `officerTasks` where status is NOT 'done' (use `ne(officerTasks.status, 'done')`)
3. Separate into overdue (due_date < now AND due_date is not null) and open tasks
4. Fetch assignee profiles for display names
5. Build a Discord embed:

```
Color: #00539f
Title: "Weekly Hen & Ink Digest"
Description: Summary line like "3 open tasks, 1 overdue"
Fields:
  - "🔴 Overdue" (if any): bullet list of task titles + assignees
  - "📋 Open tasks": bullet list of task titles + assignees
Footer: "Manage tasks at chickenscratch.me/officers"
URL: "https://chickenscratch.me/officers"
```

6. POST via `sendDiscordEmbed()`
7. Return appropriate JSON response

**Vercel Cron config** — add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/discord-digest",
      "schedule": "0 13 * * 1"
    }
  ]
}
```
(Monday at 13:00 UTC = 9am ET)

Note: Check the existing `vercel.json` — there may already be a crons array to add to rather than creating a new one.

### Part 4: Environment variable

Add to `.env.example` (after the existing Resend section):

```
# Discord webhook for officer notifications (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Also update `src/lib/env.ts` if it validates env vars — make `DISCORD_WEBHOOK_URL` optional.

## Key files to read before starting

1. `src/lib/officer-notifications.ts` — YOUR PRIMARY PATTERN. Match this style.
2. `src/app/api/officer/tasks/route.ts` — Where task creation happens
3. `src/app/api/cron/reminders/route.ts` — Cron auth pattern
4. `src/lib/reminders.ts` — How tasks are queried from the DB
5. `src/lib/db/schema.ts` — The `officerTasks` table schema
6. `src/lib/email.ts` — `logNotificationFailure` helper
7. `src/lib/env.ts` — Env var validation
8. `vercel.json` — Existing cron config (if any)

## Important constraints

- **Never throw from Discord functions** — all errors should be caught and logged
- **Never block API responses** — Discord calls should be fire-and-forget
- **Match existing code style** — use the same import patterns, error handling, logging prefixes (e.g., `[discord]` instead of `[officer-email]`)
- **Discord embed limits:** title=256 chars, description=2048 chars, field name=256 chars, field value=1024 chars, total embed=6000 chars. Truncate as needed.
- **Webhook rate limit:** Discord allows 30 requests per 60 seconds per webhook. More than enough for an RSO, but the digest should batch into one embed, not one per task.

## Testing approach

1. Create a test webhook URL in a private Discord channel
2. Set it as `DISCORD_WEBHOOK_URL` in `.env.local`
3. Test each notification type by triggering the relevant action in the app
4. Test the cron endpoint manually: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/discord-digest`
