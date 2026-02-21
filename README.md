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
- Task board with assignments, priorities, and due dates
- Meeting proposal scheduling with availability polling across all officers
- Announcements feed with email notifications to the officer team
- Daily reminder emails for stale submissions, overdue tasks, and unresponded meeting proposals

### Admin
- Role and position management for all members
- Email failure dashboard — failed notification attempts are persisted and visible for troubleshooting

### Public
- Gallery of published works with signed download URLs for visual art and inline rendering for writing
- Contact form with rate limiting

## Tech stack

| Layer           | Technology                                                        |
| --------------- | ----------------------------------------------------------------- |
| Framework       | [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript |
| Styling         | Tailwind CSS v3                                                   |
| Database        | Neon Postgres via [Drizzle ORM](https://orm.drizzle.team/)       |
| Auth            | [Clerk](https://clerk.com/)                                      |
| Storage         | Cloudflare R2 (S3-compatible)                                    |
| Email           | [Resend](https://resend.com/)                                    |
| File conversion | Make.com webhook (submission file to Google Doc)                 |
| Testing         | Vitest, Playwright                                               |
| Package manager | pnpm                                                             |

## Getting started

### Prerequisites
- Node.js 20+
- pnpm 8+
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
| `R2_PUBLIC_URL`                      | Yes      | R2 public URL                                                      |
| `R2_PUBLIC_HOSTNAME`                 | No       | R2 hostname for next/image remote patterns                         |
| `ALLOWED_DOMAINS`                    | No       | Comma-separated signup domains (default: `udel.edu`)               |
| `RESEND_API_KEY`                     | No       | Resend API key for email notifications                             |
| `NEXT_PUBLIC_SITE_URL`               | No       | Public site URL for email links (default: `http://localhost:3000`) |
| `MAKE_WEBHOOK_URL`                   | No       | Make.com webhook for file-to-Google Doc conversion                 |
| `CONTACT_FORM_RECIPIENTS`            | No       | Comma-separated emails for the contact form                        |
| `CRON_SECRET`                        | No       | Protects `/api/cron/*` endpoints (Vercel Cron)                     |

Without `RESEND_API_KEY`, emails are logged to the console instead of being sent.

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
```

## Project structure

```
src/
  app/                        # Next.js App Router pages and API routes
    api/
      committee-workflow/     # Committee actions (approve, decline, request changes, etc.)
      submissions/            # Submission CRUD and status changes
      officer/                # Officer tasks, meetings, announcements
      admin/                  # Admin endpoints (user roles, notification failures)
      cron/                   # Vercel Cron jobs (daily reminders)
      webhooks/clerk/         # Clerk user sync webhook
      contact/                # Contact form
    mine/                     # Author's submission dashboard
    committee/                # Committee kanban board
    editor/                   # Editor dashboard
    officers/                 # Officer dashboard
    admin/                    # Admin panel (roles, email failures)
    submit/                   # Submission form
    published/                # Public gallery
    contact/                  # Contact page
  components/
    committee/                # Kanban board
    mine/                     # MineClient, ContentViewer
    forms/                    # SubmissionForm
    common/                   # StatusBadge, shared UI
    ui/                       # Button, Toast, EmptyState, form helpers
  lib/
    db/schema.ts              # Drizzle ORM table definitions
    actions/                  # Server actions (storage, submissions, roles)
    auth/                     # Clerk helpers and access guards
    email.ts                  # Author-facing status emails (Resend)
    notifications.ts          # Committee notification emails (Resend)
    officer-notifications.ts  # Officer announcement & meeting emails
    reminders.ts              # Daily reminder emails (stale submissions, tasks, meetings)
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

All emails are powered by [Resend](https://resend.com/) and use branded HTML templates with Hen & Ink Society blue/gold styling.

1. **Committee notifications** (`src/lib/notifications.ts`) — internal emails routed by committee position when submissions move through the workflow.
2. **Author status emails** (`src/lib/email.ts`) — sent to authors when their submission is accepted, declined, or needs revision.
3. **Officer notifications** (`src/lib/officer-notifications.ts`) — sent to all officers when announcements are posted or meetings are proposed.
4. **Daily reminders** (`src/lib/reminders.ts`) — automated emails for stale submissions, overdue/stale tasks, and unresponded meeting proposals. Deduped so the same person isn't reminded more than once every 3 days.

Failed email deliveries are logged to the `notification_failures` table and surfaced in the admin panel.

## Storage

- **Writing files** are stored in the `submissions` R2 bucket under `{userId}/{timestamp}-{filename}`.
- **Visual art** is stored in the `art` R2 bucket with the same path structure.
- Signed URLs (default 30-minute expiry for downloads, 7-day for public gallery) are generated server-side.

## Deployment

Deploy to [Vercel](https://vercel.com/) as a Next.js project. Set the environment variables listed above and push the schema to your production database with `npx drizzle-kit push`.
