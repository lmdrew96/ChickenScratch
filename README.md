# Chicken Scratch Submissions Portal

Chicken Scratch is the submissions portal for the **Hen & Ink Society** — a student-run literary and art zine. The application handles the full lifecycle of creative work: submission, committee review, editorial feedback, and publication.

## Features

### For authors
- Submit writing (.doc, .docx, .pdf, .txt) or visual art (.jpg, .png, .gif, .webp, .pdf)
- Track submission status on the **/mine** page with an inline content viewer (images, PDFs, and text rendered in-browser)
- Receive email notifications when a submission is accepted, declined, or needs revision
- Revise work when the committee requests changes (title, preferred publishing name, file re-upload)

### For the committee
- **Submissions Coordinator** — review incoming work, approve/decline, or request changes from the author
- **Proofreader** — edit writing submissions via linked Google Docs
- **Lead Design** — lay out approved pieces in Canva
- **Editor-in-Chief** — final approve/decline after design is complete; can also request changes
- Kanban-style workflow board with role-specific columns and actions
- Automatic email notifications route submissions to the next person in the pipeline
- New submissions notify both the Submissions Coordinator and the Editor-in-Chief

### For officers
- Task board with assignments, priorities, and due dates; **Nudge button** sends a reminder email to the assigned officer or pings Discord if the task is unassigned
- Meeting proposal scheduling with availability polling across all officers
- Announcements feed with email and Discord notifications to the officer team
- Role-specific toolkit pages (`/officers/toolkits/[slug]`) with responsibilities, recurring tasks, and handoff checklists
- Daily reminder emails for stale submissions, overdue tasks, and unresponded meeting proposals
- Weekly Monday Discord digest summarising open tasks and pending items

### For the exhibition (Flock Party)
- Members-only submission portal at `/exhibition/submit` for writing and visual art intended for physical display
- Authors specify their display format (print provided, needs printing, digital display, physical original)
- Officers review and approve/decline submissions via the admin panel at `/admin/exhibition`
- Exhibition configuration (open/closed, deadline, event date) managed through site config
- Non-members see the exhibition page but cannot submit — directed to contact officers if access is needed

### Admin
- Role and position management for all members
- Email failure dashboard — failed notification attempts are persisted and visible for troubleshooting

### For authors (non-members included)
- Any authenticated user (member or not) can submit writing or visual art through the normal portal at `/submit`
- Exhibition submissions at `/exhibition/submit` are members-only

### Public
- Gallery of published works with signed download URLs for visual art and inline rendering for writing
- Contact form with rate limiting

## Tech stack

| Layer           | Technology |
| --------------- | ---------- |
| Framework       | [Next.js](https://nextjs.org/) 15.5.9 (App Router), React 19.0.0, TypeScript 5.6.3 |
| Styling         | Tailwind CSS 3.4.17 |
| Database / ORM  | Neon Postgres + [Drizzle ORM](https://orm.drizzle.team/) 0.45.1 |
| Auth            | [Clerk](https://clerk.com/) (@clerk/nextjs 6.37.1) |
| Storage         | Cloudflare R2 (S3-compatible via AWS SDK v3) |
| Email           | [Resend](https://resend.com/) 6.1.2 |
| File conversion | Make.com webhook (submission file to Google Doc) |
| Testing         | Vitest 2.1.9, Playwright 1.55.0 |
| Package manager | pnpm |

## Getting started

### Prerequisites
- Node.js 20+
- pnpm
- A Neon Postgres database
- A Clerk application
- A Cloudflare R2 bucket

### Installation
```bash
pnpm install
```

### Environment variables
```bash
cp .env.example .env.local
```

| Variable                             | Required | Description                                                        |
| ------------------------------------ | -------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                       | Yes      | Neon Postgres connection string                                    |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`  | Yes      | Clerk publishable key                                              |
| `CLERK_SECRET_KEY`                   | Yes      | Clerk secret key                                                   |
| `CLERK_WEBHOOK_SECRET`               | Yes      | Clerk webhook signing secret (svix)                                |
| `R2_ACCOUNT_ID`                      | Yes      | Cloudflare R2 account ID                                           |
| `R2_ACCESS_KEY_ID`                   | Yes      | R2 access key                                                      |
| `R2_SECRET_ACCESS_KEY`               | Yes      | R2 secret key                                                      |
| `R2_BUCKET_NAME`                     | Yes      | R2 bucket name                                                     |
| `R2_PUBLIC_URL`                      | Yes      | R2 public base URL (must be a valid URL)                           |
| `R2_PUBLIC_HOSTNAME`                 | No       | R2 hostname for next/image remote patterns                         |
| `ALLOWED_DOMAINS`                    | No       | Comma-separated signup domains (default: `udel.edu`)               |
| `RESEND_API_KEY`                     | No       | Resend API key for email notifications                             |
| `NEXT_PUBLIC_SITE_URL`               | No       | Public site URL for email links (default: `http://localhost:3000`) |
| `MAKE_WEBHOOK_URL`                   | No       | Make.com webhook for file-to-Google Doc conversion                 |
| `CONTACT_FORM_RECIPIENTS`            | No       | Comma-separated emails for the contact form (can also be set via site config) |
| `CRON_SECRET`                        | No       | Protects `/api/cron/*` endpoints (Vercel Cron)                     |
| `DISCORD_WEBHOOK_URL`                | No       | Discord webhook for officer notifications/digests (can also be set via site config) |
| `EMERGENCY_ADMIN_EMAIL`              | No       | Email address that should always be treated as an admin            |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`      | No       | Clerk routes (matches `.env.example`; used by Clerk UI components) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`      | No       | Clerk routes (matches `.env.example`; used by Clerk UI components) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`| No       | Post-auth redirect (matches `.env.example`)                        |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`| No       | Post-auth redirect (matches `.env.example`)                        |

Without `RESEND_API_KEY`, emails are logged to the console instead of being sent.

Note: some runtime settings can be configured either via env vars or via the database-backed site config (see `src/lib/site-config.ts`).

### Database setup
Push the Drizzle schema to your database:
```bash
npx drizzle-kit push
```

Or apply migrations from the `drizzle/` directory manually.

### Local development
```bash
pnpm dev
```
The dev server runs on [http://localhost:3000](http://localhost:3000).

### Quality checks
```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript --noEmit
pnpm test        # Vitest
pnpm verify:all  # typecheck + lint + route manifests + dev/prod crawls
```

## Auth & public routes

Authentication is enforced centrally in `src/middleware.ts` via Clerk.

### Public routes (no auth required)

These paths are allowlisted in the middleware and are accessible without signing in:

- `/` (landing page)
- `/login/*`, `/signup/*`
- `/published/*` (public gallery)
- `/issues/*` (zine issues)
- `/about/*`, `/contact/*`, `/privacy/*`, `/terms/*`
- `POST /api/contact/*` (contact form endpoint)
- `POST /api/webhooks/clerk/*` (Clerk webhook receiver)

### Protected routes (auth required)

Everything else requires auth by default, including:

- `/mine/*` (author dashboard)
- `/committee/*`, `/editor/*`, `/officers/*`, `/admin/*`
- Most API routes under `/api/*`

### Special cases

- **Cron:** `/api/cron/*` routes are still auth-protected by middleware, and additionally require `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set.

## Project structure

```
src/
  app/                        # Next.js App Router pages and API routes
    api/
      committee-workflow/     # Committee actions (approve, decline, request changes, etc.)
      submissions/            # Submission CRUD and status changes
      officer/
        tasks/                # Officer task board (create, update, delete, nudge)
        meetings/             # Meeting proposals and availability polling
        announcements/        # Officer-wide announcements
      admin/                  # Admin endpoints (user roles, notification failures, site config)
      cron/
        reminders/            # Daily: stale submissions, overdue tasks, meeting nudges
        discord-digest/       # Weekly Monday: officer summary to Discord
      exhibition/             # Exhibition submission and admin workflows
      zine-issues/            # Zine issue management
      editor/                 # Editor tooling (CSV/JSON exports)
      webhooks/clerk/         # Clerk user sync webhook
      contact/                # Public contact form
    mine/                     # Author's submission dashboard
    committee/                # Committee kanban board + proofread editor
    editor/                   # Editor-in-Chief dashboard
    officers/
      toolkits/[slug]/        # Role-specific officer toolkit pages
    admin/
      exhibition/             # Exhibition submission review
    exhibition/
      submit/                 # Member-only exhibition submission form
      mine/                   # Member's exhibition submission tracker
    submit/                   # Normal submission form (all authenticated users)
    published/                # Public gallery
    issues/                   # Public zine issues
    contact/                  # Contact page
  components/
    committee/                # Kanban board and inbox
    mine/                     # MineClient, ContentViewer
    officers/                 # TaskManager, MeetingManager, AnnouncementFeed
    exhibition/               # ExhibitionForm and related UI
    forms/                    # SubmissionForm
    ui/                       # Button, Toast, EmptyState, form helpers
    shell/                    # Sidebar, page layout
  lib/
    db/schema.ts              # Drizzle ORM table definitions
    actions/                  # Server actions (storage, submissions, roles, notifications)
    auth/                     # Clerk helpers and access guards
    email.ts                  # Author-facing status emails (Resend)
    notifications.ts          # Committee notification emails (Resend)
    officer-notifications.ts  # Officer announcement, meeting, and nudge emails
    discord.ts                # Discord webhook embeds (tasks, meetings, digest, nudges)
    reminders.ts              # Daily reminder emails (stale submissions, tasks, meetings)
    site-config.ts            # DB-backed runtime config with TTL cache
    rate-limit.ts             # In-memory sliding window rate limiter
    storage.ts                # Cloudflare R2 operations
    constants.ts              # Statuses, types, and shared constants
  types/                      # TypeScript type definitions
drizzle/                      # SQL migrations
```

## Committee workflow

Submissions flow through the following statuses:

```
pending_coordinator → with_coordinator → coordinator_approved
                                       ↘ coordinator_declined
                                       ↘ changes_requested (→ author revises → resubmitted)

coordinator_approved → proofreader_committed (writing)
                     → lead_design_committed (visual)

lead_design_committed → editor_approved
                      → editor_declined
                      → changes_requested
```

At each transition, the next committee member is automatically notified by email.

## Email system

All emails are powered by [Resend](https://resend.com/) and use branded HTML templates with Hen & Ink Society blue/gold styling. Discord notifications go to a configurable webhook (set via `DISCORD_WEBHOOK_URL` env var or the site config table).

1. **Committee notifications** (`src/lib/notifications.ts`) — internal emails routed by committee position when submissions move through the workflow.
2. **Author status emails** (`src/lib/email.ts`) — sent to authors when their submission is accepted, declined, or needs revision.
3. **Officer notifications** (`src/lib/officer-notifications.ts`) — email broadcasts to all officers for announcements and meeting proposals.
4. **Discord notifications** (`src/lib/discord.ts`) — embed-based webhook messages for task creation/completion, meeting finalization, officer announcements, and the weekly digest.
5. **Task nudges** — officers can click the Nudge button on any task: emails the assigned officer directly, or posts a Discord "needs an owner" ping if the task is unassigned.
6. **Daily reminders** (`src/lib/reminders.ts`) — automated emails for stale submissions, overdue/stale tasks, and unresponded meeting proposals. Deduped so the same person isn't reminded more than once every 3 days.

Failed email deliveries are logged to the `notification_failures` table and surfaced in the admin panel.

## Storage

- **Writing files** are stored in the `submissions` R2 bucket under `{userId}/{timestamp}-{filename}`.
- **Visual art** is stored in the `art` R2 bucket with the same path structure.
- Signed URLs (default 30-minute expiry for downloads, 7-day for public gallery) are generated server-side.
- Browser uploads use presigned `PUT` URLs to `*.r2.cloudflarestorage.com`, so the R2 bucket needs CORS rules for your app origins.

### R2 CORS setup (required for uploads)

Configure CORS on the bucket used by `R2_BUCKET_NAME` with rules equivalent to:

```json
[
  {
    "AllowedOrigins": [
      "https://chickenscratch.me",
      "https://www.chickenscratch.me",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

If uploads still fail with a preflight/CORS error, verify the request origin exactly matches one of `AllowedOrigins` (including `www` vs non-`www`).

## Deployment

Deploy to [Vercel](https://vercel.com/) as a Next.js project. Set the environment variables listed above and push the schema to your production database with `npx drizzle-kit push`.

If you use Vercel Cron, `vercel.json` schedules:
- `GET /api/cron/reminders` daily (`0 14 * * *`)
- `GET /api/cron/discord-digest` weekly on Mondays (`0 13 * * 1`)

When `CRON_SECRET` is set, cron endpoints require `Authorization: Bearer <CRON_SECRET>`.

