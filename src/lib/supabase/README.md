# Supabase helper guide

The Supabase helpers in this directory are intentionally split by execution context to satisfy Next.js 15 cookie
restrictions.

- `server-readonly.ts` → Use inside Server Components and other read-only SSR utilities. The client will never mutate
  cookies. Any mutation attempts are ignored (and logged once in development) so that accidental auth writes do not crash
  rendering.
- `server-action.ts` → Use inside Server Actions (files containing `"use server"`). Cookies remain writable and the
  helper throws immediately if it is imported outside of a valid Server Action scope.
- `route.ts` → Use inside Route Handlers under `app/**/route.ts`. Like the server action helper, it asserts that the
  mutable cookies API is available before writing.

If you need admin-level access (service role operations) continue to use `admin.ts`, which is independent of the cookie
mechanics above.
