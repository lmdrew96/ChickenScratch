# AGENTS.md

## Repo orientation (read these first)
- `README.md` for domain concepts (committee workflow, storage, email system) and env var list.
- `src/app/` uses **Next.js App Router** (pages + route handlers under `src/app/api/**/route.ts`).
- Auth is enforced centrally in `src/middleware.ts` via `clerkMiddleware()` + a public-route allowlist.
- DB access goes through Drizzle + Neon: `src/lib/db/index.ts` (`db()` singleton) and tables in `src/lib/db/schema.ts`.
- Runtime config is validated with Zod in `src/lib/env.ts` (`env` throws early if missing/invalid).

## Local workflows (pnpm)
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest; config in `vitest.config.ts`, alias `@ -> src`).
- DB schema/migrations: `npx drizzle-kit push` (config in `drizzle.config.ts`, SQL migrations in `drizzle/`).

## Patterns to follow when editing/adding code
- **API route handlers**: prefer `NextResponse.json(...)` and keep auth/guards (examples: `src/app/api/exhibition/admin/file/route.ts`).
- **Clerk webhooks**: verify Svix headers + signature and keep idempotency (`webhook_events` table) as in `src/app/api/webhooks/clerk/route.ts`.
- **Cron endpoints** (`src/app/api/cron/*`): if `CRON_SECRET` is set, require `Authorization: Bearer <CRON_SECRET>` (see `src/app/api/cron/reminders/route.ts`).
- **DB usage**: call `db()` (not a new client) so HMR keeps a singleton; import tables from `src/lib/db/schema.ts`.
- **Env vars**: add/rename variables in `src/lib/env.ts` (Zod schema + parse block) and document them in `README.md`.

## Integrations / cross-component data flows
- Storage: Cloudflare R2 via AWS SDK in `src/lib/storage.ts` (uploads via presigned PUT URLs; see README “R2 CORS setup”).
- Email: Resend in `src/lib/email.ts`, `src/lib/notifications.ts`, `src/lib/officer-notifications.ts`, and scheduled reminders in `src/lib/reminders.ts`.
- File conversion: Make.com webhook integration in `src/lib/convert-to-gdoc.ts` (controlled by `MAKE_WEBHOOK_URL`).

## Fast navigation (where to look)
- Auth helpers/guards: `src/lib/auth/**` (e.g., `ensureProfile`, role checks).
- Domain types: `src/types/database.ts` (Drizzle InferSelect/Insert models).
- Tests: `tests/*.test.ts` (Vitest) and `tests/e2e/*.spec.ts` (Playwright).

