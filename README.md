# Chicken Scratch Submissions Portal

Chicken Scratch is a Supabase-backed Next.js application for collecting, reviewing, and publishing student work for the Chicken Scratch zine. The project provides authenticated student workflows, an editorial dashboard, and a public gallery for published pieces.

## Features
- Email/password authentication limited to `udel.edu` and `dtcc.edu` addresses.
- Student tools to submit work, revise pieces while eligible, and download signed URLs for uploaded art.
- Editorial dashboard with filtering, assignment, status changes, publication controls, and automatic audit logging.
- Public gallery that signs Supabase Storage URLs for published visual art and renders writing inline.
- Comprehensive Row Level Security (RLS) policies to enforce per-role access.

## Tech stack
- [Next.js 14](https://nextjs.org/) (App Router) with TypeScript
- Tailwind CSS v3 for styling
- Supabase Auth, Postgres, and Storage
- pnpm for dependency management
- Vitest for unit testing

## Getting started

### Prerequisites
- Node.js 20+
- pnpm 8+
- A Supabase project (self-hosted or cloud)

### Installation
```bash
pnpm install
```

### Environment variables
Copy the template and fill in your Supabase project settings:
```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (used client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (required for registration, seeding, and server-only actions) |
| `ALLOWED_DOMAINS` | Comma-separated list of permitted signup domains (defaults to UD + DTCC) |

If the service role key is omitted, account registration will be disabled and published art downloads fall back to placeholder text until the key is provided.

### Database migrations
Migrations live in `supabase/migrations`. Apply them in order with the Supabase CLI or SQL editor:
1. `0001_initial_schema.sql`
2. `0002_rls_policies.sql`
3. `0003_storage.sql`

These files create the schema, helper functions, RLS policies, and the private `art` storage bucket.

### Seed sample data
Run the TypeScript seed script to create demo users (student, editor, admin) and a few example submissions:
```bash
pnpm seed
```
The script expects `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to be set.

### Local development
```bash
pnpm dev
```
The dev server runs on [http://localhost:3000](http://localhost:3000). Sign up with a campus email (e.g. `student@udel.edu`).

### Testing and quality checks
```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Deployment
Deploy to [Vercel](https://vercel.com/) as a Next.js App Router project. Set the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_DOMAINS`) and run the migrations against your production Supabase database. The included `supabase/seeds/001_promote_admin.sql` snippet promotes an initial admin by email.

## Storage and RLS notes
- Student uploads land in the private `art` bucket under `art/{owner_id}/{submission_id}/...`.
- Signed URLs (valid for seven days) are generated server-side when rendering the public gallery.
- RLS policies ensure students can only modify their own submissions while status is `submitted` or `needs_revision`, editors/admins can manage everything, and published items are visible anonymously.

## Troubleshooting
- Confirm the `art` bucket exists before testing uploads (migration `0003_storage.sql`).
- If uploads fail locally, ensure the service role key is only used server-side and Supabase Storage policies have been applied.
- When adjusting user roles, update `profiles.role` and have users re-authenticate so JWT claims refresh.
- For production email, replace the stub in `src/lib/email.ts` with a provider such as Resend or SendGrid.

Enjoy building with Chicken Scratch! Contributions and issue reports are welcome.
