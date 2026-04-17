# Officer Toolkit Rebuild — Phase 1 Spec

> **Goal**: Transform static wiki-style Officer Toolkits into a **live command center** that officers actually open every day.
>
> **Phase 1 scope**: Role-specific dashboards + quick actions. No new DB tables — we query existing data smarter.

---

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Position-to-slug mapping](#2-position-to-slug-mapping)
3. [Data layer — new server queries](#3-data-layer--new-server-queries)
4. [Updated toolkit data model](#4-updated-toolkit-data-model)
5. [New/modified files](#5-newmodified-files)
6. [Component specs](#6-component-specs)
7. [Build tasks (ordered)](#7-build-tasks-ordered)
8. [Future phases (out of scope)](#8-future-phases-out-of-scope)

---

## 1. Architecture overview

```
/officers/toolkits/[slug]/page.tsx   (server component — fetches all data)
  ├── ToolkitDashboard                (new — role-specific live widgets)
  │   ├── MyTasksWidget               (new — filtered officerTasks for this user)
  │   ├── SubmissionsWidget            (new — pending submissions relevant to role)
  │   ├── NextMeetingWidget            (new — next upcoming meeting proposal)
  │   └── RoleStatsWidget              (new — role-specific stat cards)
  ├── QuickActions                     (new — role-specific action buttons)
  ├── RecurringTasksTimeline           (new — replaces text list with visual timeline)
  └── RoleReference                    (refactored — collapsible version of current content)
      ├── Responsibilities (accordion)
      ├── Handoff checklist (accordion)
      └── Quick links (accordion)
```

The **toolkit detail page** (`/officers/toolkits/[slug]/page.tsx`) remains a **server component**. It fetches all data server-side and passes props to client components that handle interactivity.

---

## 2. Position-to-slug mapping

The user's position(s) from `user_roles.positions` determine which toolkit is "theirs". The mapping:

| Slug | Position (DB) | Role Name (Display) |
|------|--------------|---------------------|
| `president` | `BBEG` | BBEG |
| `treasurer` | `Dictator-in-Chief` | Dictator-in-Chief |
| `secretary` | `Scroll Gremlin` | Scroll Gremlin |
| `pr-chair` | `PR Nightmare` | PR Nightmare |

This mapping already exists implicitly. Formalize it in `src/lib/data/toolkits.ts` by adding a `position` field to `ToolkitRole`.

---

## 3. Data layer — new server queries

All queries go in a new file: `src/lib/data/toolkit-queries.ts`

This file exports async functions that the toolkit page calls. Each function takes the officer's `userId` and returns typed data.

### 3.1 `getMyTasks(userId: string)`

Query `officerTasks` where `assigned_to = userId` and `status != 'done'`, ordered by `due_date ASC NULLS LAST`.

Return type:
```ts
type TaskSummary = {
  id: string;
  title: string;
  status: string; // 'todo' | 'in_progress' | 'done'
  priority: string;
  due_date: Date | null;
};
```

### 3.2 `getPendingSubmissions()`

Query `submissions` where `status != 'withdrawn'` and `committee_status` is in the active pipeline. Active pipeline statuses:
- `'pending_coordinator'`
- `'with_coordinator'`
- `'coordinator_approved'`
- `'changes_requested'`
- `'proofreader_committed'`
- `NULL` (newly submitted, not yet in committee flow)

Return the first 10, ordered by `created_at DESC`.

Join with `profiles` on `owner_id` to get submitter name.

Return type:
```ts
type SubmissionSummary = {
  id: string;
  title: string;
  type: string;
  status: string;
  committee_status: string | null;
  created_at: Date;
  owner_name: string | null;
};
```

### 3.3 `getNextMeeting()`

Query `meetingProposals` where `archived_at IS NULL` and either `finalized_date > NOW()` (upcoming finalized) or `finalized_date IS NULL` (still being scheduled). Order by `finalized_date ASC NULLS LAST`, limit 1.

Return type:
```ts
type MeetingSummary = {
  id: string;
  title: string;
  finalized_date: Date | null;
  proposed_dates: unknown[]; // jsonb
  is_finalized: boolean;
};
```

### 3.4 `getRoleStats(slug: string)`

Role-specific stats. Reuse the same query patterns from `src/app/officers/page.tsx`.

- **All roles**: `submissionsThisMonth`, `pendingReviews`
- **president** (`BBEG`): + `upcomingMeetings` count, `openTasks` count
- **treasurer** (`Dictator-in-Chief`): + `totalUsers` (for membership tracking)
- **secretary** (`Scroll Gremlin`): + `totalUsers`, `publishedPieces`
- **pr-chair** (`PR Nightmare`): + `publishedPieces`

Return type:
```ts
type RoleStats = {
  submissionsThisMonth: number;
  pendingReviews: number;
  upcomingMeetings?: number;
  openTasks?: number;
  totalUsers?: number;
  publishedPieces?: number;
};
```

### 3.5 `getRecentAnnouncements(limit?: number)`

Query `officerAnnouncements` ordered by `created_at DESC`, limit 3. Join with `profiles` on `created_by` for the author name.

Return type:
```ts
type AnnouncementSummary = {
  id: string;
  message: string;
  author_name: string | null;
  created_at: Date;
};
```

---

## 4. Updated toolkit data model

Update `src/lib/data/toolkits.ts`:

### 4.1 Add `position` field and `QuickAction` type

```ts
export type QuickAction = {
  label: string;
  icon: string; // lucide-react icon name
  href?: string; // navigation link
  action?: string; // client-side action identifier (future use)
  description: string;
};

export type ToolkitRole = {
  slug: string;
  position: string; // NEW — matches user_roles.positions value
  title: string;
  roleName: string;
  overview: string;
  responsibilities: string[];
  recurringTasks: { cadence: string; tasks: string }[];
  handoffChecklist: string[];
  quickLinks: ToolkitLink[];
  quickActions: QuickAction[]; // NEW
};
```

### 4.2 Add `position` and `quickActions` to each toolkit entry

**president**:
```ts
{
  slug: 'president',
  position: 'BBEG',
  // ... existing fields ...
  quickActions: [
    { label: 'Schedule meeting', icon: 'Calendar', href: '/officers#meetings', description: 'Create a new meeting proposal' },
    { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Broadcast to the team' },
    { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
    { label: 'Create task', icon: 'ListTodo', href: '/officers#tasks', description: 'Assign work to the team' },
  ],
}
```

**treasurer**:
```ts
{
  slug: 'treasurer',
  position: 'Dictator-in-Chief',
  // ... existing fields ...
  quickActions: [
    { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Meeting announcements' },
    { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
    { label: 'Create task', icon: 'ListTodo', href: '/officers#tasks', description: 'Assign work to the team' },
    { label: 'Manage users', icon: 'Users', href: '/admin', description: 'Roles and membership' },
  ],
}
```

**secretary**:
```ts
{
  slug: 'secretary',
  position: 'Scroll Gremlin',
  // ... existing fields ...
  quickActions: [
    { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
    { label: 'View members', icon: 'Users', href: '/admin', description: 'Membership database' },
    { label: 'Published archive', icon: 'BookOpen', href: '/published', description: 'All published works' },
    { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Team updates' },
  ],
}
```

**pr-chair**:
```ts
{
  slug: 'pr-chair',
  position: 'PR Nightmare',
  // ... existing fields ...
  quickActions: [
    { label: 'Published works', icon: 'BookOpen', href: '/published', description: 'Share-ready content' },
    { label: 'Post announcement', icon: 'Megaphone', href: '/officers#announcements', description: 'Promo coordination' },
    { label: 'Review submissions', icon: 'FileText', href: '/committee', description: 'Check the pipeline' },
    { label: 'Create task', icon: 'ListTodo', href: '/officers#tasks', description: 'Distribution tasks' },
  ],
}
```

---

## 5. New/modified files

### New files to create

| File | Purpose |
|------|---------|
| `src/lib/data/toolkit-queries.ts` | All server-side data queries (section 3) |
| `src/components/officers/toolkit/toolkit-dashboard.tsx` | Main dashboard layout (server component wrapper) |
| `src/components/officers/toolkit/my-tasks-widget.tsx` | Client — shows officer's assigned tasks |
| `src/components/officers/toolkit/submissions-widget.tsx` | Client — shows pending submissions list |
| `src/components/officers/toolkit/next-meeting-widget.tsx` | Client — shows next meeting info |
| `src/components/officers/toolkit/role-stats-widget.tsx` | Client — stat cards |
| `src/components/officers/toolkit/quick-actions.tsx` | Client — role-specific action grid |
| `src/components/officers/toolkit/recurring-timeline.tsx` | Client — visual recurring tasks timeline |
| `src/components/officers/toolkit/role-reference.tsx` | Client — collapsible reference (refactored from current page) |

### Modified files

| File | Changes |
|------|---------|
| `src/lib/data/toolkits.ts` | Add `position`, `QuickAction` type, and `quickActions` fields to type + data |
| `src/app/officers/toolkits/[slug]/page.tsx` | Complete rewrite — calls new queries, renders new layout |
| `src/components/officers/officer-toolkits.tsx` | (Optional) Add "Your toolkit" badge if slug matches user's position |

---

## 6. Component specs

### 6.1 Toolkit detail page (rewrite)

**File**: `src/app/officers/toolkits/[slug]/page.tsx`

This is a **server component**. It:
1. Calls `requireOfficerRole()` (existing guard)
2. Looks up the toolkit data by slug from `officerToolkits`
3. Looks up the current user's position from `userRoles`
4. Determines if this toolkit is "theirs" (position matches)
5. Fetches all dashboard data via `toolkit-queries.ts` functions
6. Renders the new layout

```tsx
// Pseudocode structure:
export default async function ToolkitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { profile } = await requireOfficerRole(`/officers/toolkits/${slug}`);

  const toolkit = officerToolkits.find(t => t.slug === slug);
  if (!toolkit) notFound();

  const database = db();

  // Get the user's position from user_roles
  const userRoleResult = await database
    .select({ positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const isMyRole = userRoleResult[0]?.positions?.includes(toolkit.position) ?? false;

  // Fetch live data in parallel
  const [myTasks, submissions, nextMeeting, stats, announcements] = await Promise.all([
    getMyTasks(profile.id),
    getPendingSubmissions(),
    getNextMeeting(),
    getRoleStats(slug),
    getRecentAnnouncements(3),
  ]);

  // Resolve quick link URLs from site_config (existing pattern)
  const linksWithUrls = await Promise.all(
    toolkit.quickLinks.map(async (link) => {
      const url = await getSiteConfigValue(link.configKey);
      return { ...link, url };
    })
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${toolkit.title} Toolkit`}
        description={toolkit.roleName}
        showBackButton
        backButtonHref="/officers"
        backButtonLabel="Back to Officers"
      />

      {/* "This is your role" banner */}
      {isMyRole && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 flex items-center gap-2">
          <span className="text-[var(--accent)] text-sm font-semibold">✦ This is your role</span>
          <span className="text-sm text-slate-300">— your personal command center</span>
        </div>
      )}

      {/* Live dashboard */}
      <ToolkitDashboard
        tasks={myTasks}
        submissions={submissions}
        nextMeeting={nextMeeting}
        stats={stats}
        announcements={announcements}
        slug={slug}
      />

      {/* Quick actions */}
      <QuickActions actions={toolkit.quickActions} />

      {/* Recurring tasks timeline */}
      <RecurringTimeline tasks={toolkit.recurringTasks} />

      {/* Reference material (collapsible) */}
      <RoleReference
        overview={toolkit.overview}
        responsibilities={toolkit.responsibilities}
        handoffChecklist={toolkit.handoffChecklist}
        quickLinks={linksWithUrls}
      />
    </div>
  );
}
```

### 6.2 ToolkitDashboard

**File**: `src/components/officers/toolkit/toolkit-dashboard.tsx`

Layout: 2-column grid on `lg:`, single column on mobile.

- Left column: `MyTasksWidget` + `SubmissionsWidget`
- Right column: `RoleStatsWidget` + `NextMeetingWidget` + recent announcements

All child widgets are client components (`'use client'`) for interactivity.

### 6.3 MyTasksWidget

**File**: `src/components/officers/toolkit/my-tasks-widget.tsx`

`'use client'` component.

Shows up to 5 tasks assigned to the current officer. Each task shows:
- Title
- Priority indicator (color dot: `text-red-400` = urgent, `text-amber-400` = high, `text-slate-400` = medium, `text-gray-500` = low)
- Due date with relative time ("due in 3 days", "overdue by 2 days")
- Status pill (`todo` = gray, `in_progress` = blue)

Overdue tasks get a subtle red-tinted background.

Empty state: "No tasks assigned — you're all caught up! 🎉"

Footer link: "View all tasks →" → `/officers#tasks`

### 6.4 SubmissionsWidget

**File**: `src/components/officers/toolkit/submissions-widget.tsx`

`'use client'` component.

Shows up to 5 pending submissions. Each shows:
- Title + type badge (poetry/prose/art — small colored pill)
- Submitter name (from joined profile)
- Committee status as a human-readable label (map `committee_status` values to friendly strings like "Awaiting coordinator", "In proofreading", etc.)
- Time since submission (relative)

Empty state: "No submissions in the pipeline — time to promote! 📣"

Footer link: "View full pipeline →" → `/committee`

### 6.5 NextMeetingWidget

**File**: `src/components/officers/toolkit/next-meeting-widget.tsx`

`'use client'` component.

Shows the next scheduled (or in-progress scheduling) meeting.

Three states:
1. **Finalized**: Show meeting title, formatted date/time, "in X days" relative label, link to meeting scheduler
2. **Scheduling in progress**: Show "Still scheduling — X date options proposed", prompt to submit availability
3. **No meetings**: "No upcoming meetings — schedule one?"

### 6.6 RoleStatsWidget

**File**: `src/components/officers/toolkit/role-stats-widget.tsx`

`'use client'` component.

Grid of stat cards (2x2 responsive). Each card:
- Numeric value (text-2xl font-bold)
- Label below (text-xs uppercase tracking-wider text-slate-400)

Color-code by meaning:
- Submissions this month → `text-[var(--accent)]`
- Pending reviews → `text-amber-400`
- Published pieces → `text-emerald-400`
- Other stats → `text-blue-400`

Same card style: `rounded-xl border border-white/10 bg-white/5 p-4`

### 6.7 QuickActions

**File**: `src/components/officers/toolkit/quick-actions.tsx`

`'use client'` component.

Section header: "Quick actions" with a Zap icon.

Grid of action cards (2x2 on desktop, 1-column on mobile). Each card:
- Icon (dynamically rendered from lucide-react by name — use a small icon map)
- Label (font-semibold text-white)
- Description (text-sm text-slate-400)
- Entire card is a `<Link href={action.href}>`

Hover: `hover:bg-white/10 transition-all hover:-translate-y-1` + accent border glow

Icon map implementation:
```tsx
import { Calendar, Megaphone, FileText, ListTodo, Users, BookOpen } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar, Megaphone, FileText, ListTodo, Users, BookOpen,
};
```

### 6.8 RecurringTimeline

**File**: `src/components/officers/toolkit/recurring-timeline.tsx`

`'use client'` component.

Section header: "Recurring responsibilities" with a Clock icon.

Vertical timeline layout. Each cadence group:
- Left: colored dot + vertical line connector
- Right: cadence label (bold, uppercase small) + task description

Color mapping for cadence:
- `Per Meeting` / `Weekly` → `bg-emerald-400` (frequent)
- `Bi-weekly` / `Per Event` → `bg-blue-400` (regular)
- `Monthly` / `Per Issue` / `Ongoing` → `bg-amber-400` (periodic)
- `Per Semester` / `Annually` → `bg-purple-400` (rare)

### 6.9 RoleReference

**File**: `src/components/officers/toolkit/role-reference.tsx`

`'use client'` component.

Section header: "Role reference" with a BookOpen icon.

Collapsible accordion using `<details>`/`<summary>` (native HTML, no library needed):

```tsx
<details className="group rounded-xl border border-white/10 bg-white/5 overflow-hidden">
  <summary className="px-4 py-3 cursor-pointer font-semibold text-white hover:bg-white/10 transition-colors flex items-center justify-between">
    <span>Core Responsibilities</span>
    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
  </summary>
  <div className="px-4 pb-4 pt-2 border-t border-white/10">
    {/* content */}
  </div>
</details>
```

Sections:
1. **Role Overview** — `open` by default, shows the overview paragraph
2. **Core Responsibilities** — collapsed, shows the responsibilities list
3. **Handoff Checklist** — collapsed, shows checklist items with disabled checkboxes
4. **Quick Links** — collapsed, shows links with "Open" buttons (same as current implementation)

---

## 7. Build tasks (ordered)

Claude Code should execute these in order. Each task is independently testable.

### Task 1: Update toolkit data model

**Files**: `src/lib/data/toolkits.ts`

1. Add `position: string` to `ToolkitRole` type
2. Add `QuickAction` type (exported)
3. Add `quickActions: QuickAction[]` to `ToolkitRole` type
4. Add `position` value to each toolkit entry: `'BBEG'`, `'Dictator-in-Chief'`, `'Scroll Gremlin'`, `'PR Nightmare'`
5. Add `quickActions` arrays to each toolkit entry (see section 4.2)

**Verify**: `pnpm typecheck` passes.

### Task 2: Create toolkit queries

**Files**: `src/lib/data/toolkit-queries.ts`

1. Implement all 5 query functions from section 3
2. Use `db()` singleton pattern (per AGENTS.md): `import { db } from '@/lib/db';`
3. Import tables from `src/lib/db/schema.ts`
4. Use drizzle query builders (eq, ne, and, or, gte, isNull, inArray, count, desc, asc) — import from `drizzle-orm`
5. Export typed return types

**Verify**: `pnpm typecheck` passes.

### Task 3: Create widget components

**Files**: All files in `src/components/officers/toolkit/`

1. Create the `src/components/officers/toolkit/` directory
2. Create all 7 widget components (sections 6.3–6.9)
3. Each should be a `'use client'` component
4. Use existing design patterns: `rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg` for section wrappers, `rounded-xl border border-white/10 bg-white/5 p-4` for inner cards
5. Use lucide-react icons (already a project dependency)
6. Handle empty states gracefully with friendly messages
7. Prop types should match the return types from toolkit-queries.ts

**Verify**: `pnpm typecheck` passes.

### Task 4: Create dashboard layout

**Files**: `src/components/officers/toolkit/toolkit-dashboard.tsx`

1. Create the grid layout component
2. Import and arrange all widget components in a 2-column grid (`grid gap-8 lg:grid-cols-2`)
3. Left column: MyTasksWidget + SubmissionsWidget
4. Right column: RoleStatsWidget + NextMeetingWidget
5. Props: all the data from toolkit queries + slug

**Verify**: `pnpm typecheck` passes.

### Task 5: Rewrite toolkit detail page

**Files**: `src/app/officers/toolkits/[slug]/page.tsx`

1. Complete rewrite per section 6.1
2. Keep it as a server component (no `'use client'` directive)
3. Use `requireOfficerRole()` guard (existing)
4. Fetch user's position from `userRoles` table using `db()` + `eq()`
5. Call all query functions in parallel with `Promise.all`
6. Keep resolving quick link URLs from `siteConfig` (existing `getSiteConfigValue` pattern)
7. Render the new layout: banner → dashboard → quick actions → recurring timeline → reference

**Verify**: `pnpm dev` — navigate to `/officers/toolkits/president` and confirm it renders the new layout with live data (or graceful empty states).

### Task 6: Update toolkit listing component (optional)

**Files**: `src/components/officers/officer-toolkits.tsx`

Enhancement: if the logged-in user's position matches a toolkit slug, show a subtle "Your role" badge on that card. This requires the parent (officers page) to pass the user's positions as a prop.

If this adds too much complexity, skip it — it's a nice-to-have.

**Verify**: `pnpm dev` — the officers page still renders correctly.

### Task 7: Quality gates

1. Run `pnpm typecheck` — must pass
2. Run `pnpm lint` — must pass (fix any issues)
3. Run `pnpm test` — existing tests must still pass
4. Manual test: navigate all 4 toolkit pages, verify data loads, empty states work, links navigate correctly

---

## 8. Future phases (out of scope for now)

Documented here so Claude Code doesn't scope-creep:

- **Phase 2 — Recurring Task Engine**: Auto-generate `officerTasks` from `recurringTasks` cadence data via a cron job. Needs a `recurring_task_instances` table to track completions per period.
- **Phase 3 — Guided Handoff**: Interactive wizard with step-by-step flow, successor notes, credential transfer. Needs an `officer_handoffs` table.
- **Phase 4 — Onboarding Mode**: First-time officer checklist with progress tracking. Needs an `officer_onboarding` table.
- **Phase 5 — Officer Activity Feed**: Timeline of actions taken across the dashboard.

---

## Design notes

### Visual language
- Follow existing dark theme: `bg-white/5`, `border-white/10`, `text-[var(--text)]`, `text-slate-300`/`text-slate-400` for secondary text
- Accent color: `var(--accent)` for highlights and interactive elements
- Section card pattern: `rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg`
- Inner card pattern: `rounded-xl border border-white/10 bg-white/5 p-4`
- Hover states: `hover:bg-white/10 transition-all hover:-translate-y-1`

### Accessibility
- All interactive elements must be keyboard-accessible
- Color is never the sole indicator — always pair with text/icons
- Empty states use clear, friendly messaging

### Mobile
- Dashboard grid collapses to single column on mobile
- Quick actions grid: 2x2 on desktop, 1-column on mobile
- Accordion sections are touch-friendly with large tap targets

---

## Existing code reference

Key files to understand before building:

- **DB schema**: `src/lib/db/schema.ts` — all table definitions (officerTasks, submissions, meetingProposals, officerAnnouncements, userRoles, profiles, siteConfig)
- **DB usage pattern**: `const database = db();` then use drizzle query builders
- **Auth guards**: `src/lib/auth/guards.ts` — use `requireOfficerRole()` for toolkit pages
- **Officer positions**: `OFFICER_POSITIONS = ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'PR Nightmare']`
- **Current toolkit data**: `src/lib/data/toolkits.ts` — the `officerToolkits` array we're extending
- **Current toolkit page**: `src/app/officers/toolkits/[slug]/page.tsx` — what we're rewriting
- **Officers page**: `src/app/officers/page.tsx` — has query patterns we can reuse (stats, pending reviews, etc.)
- **Site config helper**: `getSiteConfigValue(key)` from `src/lib/site-config` — for resolving quick link URLs
