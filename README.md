<<<<<<< HEAD
# ChickenScratch
ChickenScratch Submissions Portal
=======
# Chicken Scratch Submissions Portal

Chicken Scratch is a Supabase-backed Next.js app for collecting, reviewing, and publishing student work for the Chicken Scratch zine. The project uses the Next.js App Router, TailwindCSS, and Supabase (Auth, Postgres, and Storage) to provide end-to-end workflows for students, editors, and administrators.

## Tech stack

- [Next.js 15](https://nextjs.org/) with the App Router
- TypeScript and TailwindCSS
- Supabase Auth, Postgres, and Storage with Row Level Security
- pnpm for dependency management
- Vitest for unit tests

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 8+
- A Supabase project (local CLI or hosted)

### Installation

```bash
pnpm install
```

Create a `.env.local` file from the template and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (required for seeding and server-side admin actions) |
| `ALLOWED_DOMAINS` | Comma-separated list of allowed email domains (defaults to UD and DTCC) |

### Database migrations

The SQL migrations are located under `supabase/migrations`. Apply them using the Supabase CLI or the dashboard SQL editor in order:

1. `0001_initial_schema.sql`
2. `0002_rls_policies.sql`
3. `0003_storage.sql`

The migrations create all required tables, functions, policies, and storage buckets.

### Seeding sample data

A TypeScript seed script promotes demo users (student, editor, admin) and inserts example submissions. Run it with the service role key loaded:

```bash
pnpm seed
```

The script relies on `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### Development

```bash
pnpm dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000). Sign up using a campus email (e.g. `student@udel.edu`).

### Tests and checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Deployment

Deploy to Vercel as a Next.js App Router project. Set the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_DOMAINS`) in the Vercel dashboard. Run the SQL migrations against your production Supabase database before promoting the deployment.

## Supabase schema overview

- `profiles`: mirrors `auth.users` with roles (`student`, `editor`, `admin`).
- `submissions`: submissions with metadata, editorial status, and publication fields.
- `audit_log`: action log capturing editor activity.

Row Level Security policies enforce:

- Students can view and edit only their own submissions while status is `submitted` or `needs_revision`.
- Editors and admins can see and update all submissions.
- Published submissions are visible to the public.

Storage uses a private `art` bucket with namespace `art/{owner_id}/{submission_id}/`. Signed URLs (valid for seven days) are generated server-side for published works.

## Key routes

| Route | Description |
| --- | --- |
| `/login` | Email/password authentication with domain guard |
| `/submit` | Submission form for students (writing or visual) |
| `/mine` | Student dashboard with revision tools |
| `/editor` | Editor dashboard with filters, assignment, status changes, notes, and publication tools |
| `/published` | Public gallery of published work |
| `/published/[id]` | Detail page with text and download links |

All write operations go through Next.js route handlers that verify Supabase roles before mutating data.

## Email notifications

The project includes a stub email service (`src/lib/email.ts`) that logs accepted, declined, and needs-revision notifications to the console. Replace the stub with an actual provider (e.g. Resend, SendGrid) in production.

## Rate limiting

Students can create at most five submissions per hour. Attempts over the limit return a friendly error both in the UI and the API response. Unit tests cover the rate limit helper.

## Troubleshooting

- Ensure the `art` storage bucket exists (created by the migration) before uploading files.
- If uploads fail during local development, confirm `SUPABASE_SERVICE_ROLE_KEY` is not exposed to the browser (only used server-side) and that RLS policies match the schema.
- When changing editorial roles, update `profiles.role` and re-authenticate to refresh JWT claims.

Enjoy building with Chicken Scratch! Contributions and issue reports are welcome.
>>>>>>> 02817a2 (fix: stabilize supabase types and test tooling)
