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
- Task management, meeting scheduling, and announcements dashboard

### Public
- Gallery of published works with signed download URLs for visual art and inline rendering for writing

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v3 |
| Database | Neon Postgres via [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Clerk](https://clerk.com/) |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | [Resend](https://resend.com/) |
| File conversion | Make.com webhook (submission file to Google Doc) |
| Testing | Vitest, Playwright |
| Package manager | pnpm |

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

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `R2_ACCOUNT_ID` | Yes | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key |
| `R2_BUCKET_NAME` | Yes | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | R2 public URL |
| `ALLOWED_DOMAINS` | No | Comma-separated signup domains (default: `udel.edu`) |
| `RESEND_API_KEY` | No | Resend API key for email notifications |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for email links (default: `http://localhost:3000`) |
| `MAKE_WEBHOOK_URL` | No | Make.com webhook for file-to-Google Doc conversion |
| `CONTACT_FORM_RECIPIENTS` | No | Comma-separated emails for the contact form |

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
  app/                    # Next.js App Router pages and API routes
    api/
      committee-workflow/ # Committee actions (approve, decline, request changes, etc.)
      submissions/        # Submission CRUD and status changes
      notifications/      # Notification endpoints
    mine/                 # Author's submission dashboard
    committee/            # Committee kanban board
    editor/               # Editor dashboard
    submit/               # Submission form
    published/            # Public gallery
  components/
    committee/            # Kanban board
    mine/                 # MineClient, ContentViewer
    forms/                # SubmissionForm
    common/               # StatusBadge, shared UI
    ui/                   # Button, Toast, EmptyState, form helpers
  lib/
    db/schema.ts          # Drizzle ORM table definitions
    actions/              # Server actions (storage, submissions)
    auth/                 # Clerk helpers and access guards
    email.ts              # Author-facing status emails (Resend)
    notifications.ts      # Committee notification emails (Resend)
    storage.ts            # Cloudflare R2 operations
    constants.ts          # Statuses, types, and shared constants
  types/                  # TypeScript type definitions
drizzle/                  # SQL migrations
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

Two email flows, both powered by Resend:

1. **Committee notifications** (`src/lib/notifications.ts`) — internal emails routed by committee position when submissions move through the workflow.
2. **Author status emails** (`src/lib/email.ts`) — branded emails sent to authors when their submission is accepted, declined, or needs revision. Includes the Hen & Ink Society logo, blue/gold branding, editor notes, and a link to `/mine`.

## Storage

- **Writing files** are stored in the `submissions` R2 bucket under `{userId}/{timestamp}-{filename}`.
- **Visual art** is stored in the `art` R2 bucket with the same path structure.
- Signed URLs (default 30-minute expiry for downloads, 7-day for public gallery) are generated server-side.

## Deployment

Deploy to [Vercel](https://vercel.com/) as a Next.js project. Set the environment variables listed above and push the schema to your production database with `npx drizzle-kit push`.
