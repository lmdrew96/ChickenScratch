# Officer Toolkit Overhaul — Overview Spec

> Master reference for the `chickenscratch` ChaosPatch series. Each patch title points back to a section here (`§N`).

## Vision

Officer toolkit pages (`/officers/toolkits/[slug]`) are currently ~70% a duplicate of the main `/officers` dashboard and ~30% static documentation. They should instead be **role-specific workspaces** where each officer opens the page and immediately knows what they need to do as *this role* — today, this week, and this Chicken Scratch cycle.

The scaffolding is solid: route structure, widget separation, `isMyRole` banner, site_config-backed quick links, parallelized `toolkit-queries.ts`. The weakness is what fills the shapes. Most of this work fills in existing shapes and adds targeted pieces — not a rebuild.

## Guiding principles

1. **Role-specific over global.** If a widget would render the same thing on every toolkit, it probably belongs on `/officers`, not a toolkit.
2. **Actionable over informational.** Quick Actions should *do the thing* inline when possible, not just link elsewhere.
3. **Persistent over ephemeral.** Institutional knowledge (SOPs, handoff notes, predecessor insights) must survive officer turnover — that's the biggest long-term value.
4. **Cycle-aware.** Every role orbits the monthly Chicken Scratch production cycle; toolkit UI should make that visible.
5. **Mobile-first for meeting use.** Officers are often on phones during events and meetings.

## Recommended implementation order

- **Tier 1 — Structural (applies to all four roles):** §1, §2, §3, §4
- **Tier 2 — Treasurer overhaul (highest compliance value):** §5, §6, §7, §8
- **Tier 3 — Knowledge persistence:** §9, §10
- **Tier 4 — Role-specific action surfaces:** §11, §12, §13
- **Tier 5 — Polish:** §14

Tier 1 can be tackled in any order. Tier 2 should be done roughly §5 → §6 → §7 → §8. Tier 3 is sequential: §9 before §10.

## Key repo locations (reference)

- `src/app/officers/page.tsx` — main officers dashboard
- `src/app/officers/toolkits/[slug]/page.tsx` — individual toolkit page
- `src/lib/data/toolkits.ts` — static role data (`officerToolkits` array)
- `src/lib/data/toolkit-queries.ts` — live data fetchers (`getMyTasks`, `getPendingSubmissions`, `getNextMeeting`, `getRoleStats`, `getRecentAnnouncements`)
- `src/components/officers/toolkit/` — existing widgets
  - `toolkit-dashboard.tsx` — top-of-page dashboard (candidate for replacement in §1)
  - `recurring-timeline.tsx` — static cadence list (replaced in §2)
  - `quick-actions.tsx`, `role-reference.tsx`, `my-tasks-widget.tsx`, `submissions-widget.tsx`, `next-meeting-widget.tsx`, `role-stats-widget.tsx`

---

## §1 — "This Week for [role]" card

**Priority:** HIGH — this is the single biggest UX shift across the overhaul.

**Replaces:** the top-of-page `ToolkitDashboard` dashboard-mirror.

**What it does:** a single role-specific card at the top of each toolkit that surfaces what *this role* needs to do this week, computed from recurring task cadences (§2), Chicken Scratch cycle milestones (§3), pending queue items specific to this role, and live heads-up alerts (e.g., treasurer receipt aging from §6).

**Example — Treasurer the week before a print run:**
- ⚠️ April issue prints in 4 days — budget approval needed
- 🧾 2 receipts aging (day 38, day 42 of 45) — submit RFC now
- 💰 $127 of $400 GOB remaining

**Example — President the week of a meeting:**
- 📝 Draft Wed creative writing prompt (not started)
- 📅 Officer meeting Friday — agenda empty
- 👤 Monthly faculty advisor check-in due in 6 days

**Files:**
- New: `src/components/officers/toolkit/this-week-card.tsx`
- New: `src/lib/data/this-week.ts` — per-role aggregators: `getThisWeekForPresident()`, `getThisWeekForTreasurer()`, etc.
- Modify: `src/app/officers/toolkits/[slug]/page.tsx` — render the new card; consider removing or demoting `ToolkitDashboard` since it duplicates `/officers`.

**Design notes:**
- Each item has: emoji/icon, title, urgency level (info / warn / danger), optional deadline, optional CTA link.
- Compute items server-side where possible; stream or progressively render if slow.
- Brand colors: Ink Gold `#FFD200`, Hen Blue `#00539F`.

**Done when:** each toolkit renders 3–8 role-specific items at the top with urgency styling and clickable CTAs. The old `ToolkitDashboard` is either removed or explicitly repurposed.

---

## §2 — Stateful recurring task checkboxes

**Priority:** HIGH — small scope, large perceived value.

**Replaces:** `RecurringTimeline` rendering static text from `toolkits.ts`.

**What it does:** converts `recurringTasks: { cadence, tasks }[]` into a DB-backed model where each cadence group has individual trackable tasks that can be checked off, reset automatically when the cadence elapses (weekly = Monday, monthly = 1st, per-issue = when a new issue starts), and track per-user completion state (not shared between officers).

**Files:**
- Migration: new `recurring_task_completions` table (`user_id`, `task_id`, `completed_at`, `cycle_key`)
- Update: `src/lib/data/toolkits.ts` — give each recurring task a stable slug ID.
- New: `src/components/officers/toolkit/stateful-recurring-tasks.tsx` — replaces `recurring-timeline.tsx` usage.
- New: server action for toggling completion.

**Design notes:**
- `cycle_key` approach: compute the current bucket for each cadence (e.g. `weekly-2026-W16`, `monthly-2026-04`). Completions are valid only within their bucket — stale buckets are treated as reset on read.
- Keep cadence labels the same as `toolkits.ts`; only add stable slugs underneath.

**Done when:** an officer can check off "Draft creative writing prompt" and it stays checked until the next Monday, when it auto-resets.

---

## §3 — Chicken Scratch cycle header

**Priority:** MEDIUM — shared across every toolkit, small implementation.

**What it does:** a persistent banner across all toolkit pages showing current issue production state:

> **April 2026 Issue · Week 3 of 4 · Submissions close in 5 days**

**Files:**
- New: `src/lib/data/issue-cycle.ts` — compute cycle state from the `issues` table and submissions deadlines.
- New: `src/components/officers/toolkit/cycle-header.tsx`
- Modify: `src/app/officers/toolkits/[slug]/page.tsx` — mount under `PageHeader`.

**Design notes:**
- "Week X of Y" keys off the active issue's timeline (issue start → publication date).
- Make the component reusable — it's also useful on `/committee` and potentially `/officers`.

**Done when:** every toolkit page shows a live cycle header with accurate week-in-cycle count and submissions-close countdown.

---

## §4 — Quick link health indicators

**Priority:** LOW — tiny patch, meaningful fix.

**What it does:** when `getSiteConfigValue(link.configKey)` returns `null`/`undefined`, replace the silently-broken button with a visible "⚙️ Admin: set URL" state.

**Files:**
- Modify: `src/components/officers/toolkit/role-reference.tsx` — detect null URL, render disabled/admin-prompt state.
- Optional: link the prompt directly to the admin settings page that manages `site_config`.

**Design notes:**
- For admins (BBEG / Dictator-in-Chief): clickable quick-edit.
- For non-admins: "Not yet configured — ask an admin."

**Done when:** no toolkit quick link silently 404s; all missing URLs are clearly labeled.

---

## §5 — Treasurer: Reimbursement pipeline widget

**Priority:** HIGH — central to Treasurer toolkit overhaul.

**What it does:** visual four-stage pipeline for every open reimbursement:

```
[Submitted] → [Approved] → [Check received] → [Ledgered]
```

Each row shows: expense description + amount, current stage + stage-transition date, days since last transition (highlight if stuck > N days), deep link to supporting documents.

**Files:**
- Migration: new `reimbursements` table (`id`, `description`, `amount`, `receipt_date`, `submitted_at`, `approved_at`, `check_received_at`, `check_number`, `ledgered_at`, `notes`).
- New: `src/components/officers/toolkit/treasurer/reimbursement-pipeline.tsx`
- New: server actions for transitioning stages.

**Design notes:**
- Pipeline mirrors the real UD RSO flow: out-of-pocket → RFC submitted → approval email with check number → check received → ledger entry.
- "Ledgered" stage is only reachable after `check_number` is recorded (per confirmed process).
- Stage transitions should be one click + optional note.

**Done when:** Treasurer can add a new reimbursement request and track it through all four stages without context-switching.

---

## §6 — Treasurer: Receipt aging alerts + cash deposit countdown

**Priority:** HIGH — direct compliance value.

**What it does:** two complementary compliance nags:
1. **Receipt aging:** any receipt older than 30 days → yellow; 40+ days → red. Counts against the 45-day RFC submission window.
2. **Cash deposit countdown:** any logged cash donation not yet marked `deposited` → live countdown against the 24-hour deposit rule.

**Files:**
- Migration: add `deposited_at` field to the cash donations table.
- Feed alerts into the "This Week" aggregator from §1.
- New: `src/components/officers/toolkit/treasurer/compliance-alerts.tsx` for the dedicated toolkit section.

**Design notes:**
- Compliance rules should live in a central module so they can be reused in alerts, the This Week card, and future email reminders.
- Red-state alerts are good candidates for future email/Discord notifications.

**Done when:** a treasurer with an aging receipt sees it in both the This Week card and the toolkit compliance panel, with days remaining.

---

## §7 — Treasurer: $400 GOB budget tracker

**Priority:** MEDIUM.

**What it does:** visual spent/remaining progress bar for the General Operating Budget, plus an "upcoming known expenses" list that warns when projected total exceeds remaining budget.

**Files:**
- Use existing ledger data; no new table strictly required if ledger entries already categorize against GOB.
- New: `src/components/officers/toolkit/treasurer/gob-tracker.tsx`

**Design notes:**
- $400 is the current allocation — make this a config value so the $800 qualification is a one-line change.
- "Upcoming expenses" is manual-entry at first — it's a planning tool, not an auto-forecast.

**Done when:** Treasurer sees a single-glance budget bar and a running list of known upcoming spend with projected remaining.

---

## §8 — Treasurer: Inline ledger entry form

**Priority:** MEDIUM.

**What it does:** expandable form on the Treasurer toolkit that captures a ledger entry (expense / income / donation) without leaving the page. Writes to the same ledger table powering §7 and linked to §5 reimbursements.

**Files:**
- New: `src/components/officers/toolkit/treasurer/ledger-entry-form.tsx`
- Server action: `createLedgerEntry(type, amount, category, description, date)`.

**Design notes:**
- Default `date` to today.
- Categories should map to UD purpose codes where applicable; a "Chicken Scratch printing (out-of-pocket)" preset shortcuts the most common entry.
- When an out-of-pocket expense is entered, auto-suggest creating a reimbursement record (§5) pre-populated with the same data.

**Done when:** typical ledger entries can be recorded in under 30 seconds without opening an external sheet.

---

## §9 — SOP library infrastructure

**Priority:** MEDIUM — foundational for §10 and the long-term institutional-memory goal.

**What it does:** per-role markdown knowledge hub. Each toolkit gains an "SOPs & Knowledge Base" section listing rendered markdown articles that persist across officer terms. **This is the single most durable contribution of the overhaul** — institutional memory that survives turnover.

**Files:**
- Migration: new `sop_articles` table (`id`, `role_slug`, `title`, `slug`, `body_md`, `updated_at`, `updated_by`, `tags[]`).
- New: `src/app/officers/toolkits/[slug]/sops/page.tsx` — list view.
- New: `src/app/officers/toolkits/[slug]/sops/[sop-slug]/page.tsx` — article view.
- New: authoring interface (officer or admin).
- Modify: `src/app/officers/toolkits/[slug]/page.tsx` — add "Recent SOPs" teaser section linking to the full library.

**Design notes:**
- Markdown rendering: use the app's existing lib (check for `react-markdown` already in use).
- Edit history is not required in v1 — `updated_at` + `updated_by` is enough.
- Make articles shareable via URL so officers can link to them in Discord/emails.
- Global search across SOPs is a future enhancement once content volume justifies it.

**Done when:** officers can read and edit role-specific SOPs at `/officers/toolkits/[slug]/sops`.

---

## §10 — Seed initial SOPs per role

**Depends on:** §9.

**What it does:** populate the library with institutional knowledge already captured in this project's conversation history.

**Treasurer SOPs to seed:**
- "Chicken Scratch printing reimbursement flow" — public library printing, out-of-pocket, RFC form, 45-day receipt window, ledger entry only after check-number email.
- "Difference between purpose-code flow and out-of-pocket flow."
- "24-hour cash donation deposit rule."
- "Email receipts vs. original-language policy" *(pending confirmation with Jessica/Suzanne — flag as draft)*.
- "How to request an allocation board fund increase (toward the $800 GOB)."

**Secretary SOPs to seed:**
- "Voting rights revocation/restoration per Article VIII."
- "Minutes format and Discord archival process."
- "Member removal formal procedure (Article XII)."

**PR SOPs to seed:**
- "Brand assets (logos, colors, masthead) and where they live."
- "Mon/Wed/Fri content rhythm and monthly anchors."
- "Chicken Scratch issue distribution checklist."

**President SOPs to seed:**
- "RSO re-registration checklist."
- "Faculty advisor cadence and topics to cover."
- "Election process (Article XI)."
- "Officer removal procedure (Article XII)."

**Files:** SQL seed or server-action bulk insert.

**Done when:** every role has ≥3 seeded SOPs visible on their toolkit.

---

## §11 — Secretary: Inline attendance-taking interface

**Priority:** MEDIUM.

**What it does:** when a meeting is scheduled for today, the Secretary toolkit surfaces a roster of current members with check/absent/excused buttons. Commits attendance directly. Auto-flags members approaching the 3-meetings-per-month threshold (Article VIII).

**Files:**
- Migration: `meeting_attendance` table if not already present (`member_id`, `meeting_id`, `status`, `recorded_at`, `recorded_by`).
- New: `src/components/officers/toolkit/secretary/attendance-taker.tsx`
- Server action: `recordAttendance(meetingId, entries[])`.
- Helper: "voting rights at risk this month" computation.

**Design notes:**
- Only render the attendance taker if there's a meeting today or within the last N hours.
- "Voting rights at risk" surfaces in the This Week card (§1) too.
- Also cover the 2-consecutive-months membership-loss rule.

**Done when:** Secretary can take attendance for a meeting in under 1 minute from the toolkit page, with at-risk members visually flagged.

---

## §12 — PR: Content calendar widget

**Priority:** LOW.

**What it does:** Mon/Wed/Fri content slots for the current + upcoming 2 weeks. Each slot has status (Empty / Drafted / Scheduled / Posted), optional draft text/attachment, and quick-insert templates (Meet the Flock announcement, Issue release, Meeting reminder, Event promo).

**Files:**
- Migration: `pr_posts` table (`scheduled_for`, `status`, `draft_text`, `channels[]`, `attachments_jsonb`).
- New: `src/components/officers/toolkit/pr/content-calendar.tsx`
- New: `src/components/officers/toolkit/pr/post-composer.tsx`

**Design notes:**
- Templates are just a starter body + channel pre-selection; user always edits before posting.
- Don't auto-post — this is drafting/scheduling only (posting integration is future work).
- Brand assets (logos, masthead) should be one-click insertable via the composer.

**Done when:** PR Chair has a visual 3-week content calendar with fill-in templates and can move posts through Drafted → Scheduled → Posted.

---

## §13 — President: Meeting agenda builder + weekly prompt archive

**Priority:** LOW.

**What it does:** two linked workspaces:
1. **Agenda builder** — persistent draft of the next meeting's agenda. A "pull from last week's minutes" action copies unresolved items into the draft.
2. **Prompt archive** — list of past weekly creative writing prompts with used/unused state and reuse shortcut. Avoids blank-page syndrome and enables prompt reuse across years.

**Files:**
- Migration: `meeting_agendas` table (`meeting_id`, `draft_md`, `finalized_at`) and `creative_prompts` table (`id`, `text`, `first_used_at`, `last_used_at`, `tags[]`).
- New: `src/components/officers/toolkit/president/agenda-builder.tsx`
- New: `src/components/officers/toolkit/president/prompt-archive.tsx`

**Design notes:**
- Agenda draft should autosave.
- "Pull from last minutes" depends on the Secretary's minutes — graceful fallback if none exist.
- Prompt archive supports quick tagging (poetry, flash-fiction, visual-art) for future filtering.

**Done when:** President can draft next week's agenda in-toolkit and pull a prompt from the archive without external tools.

---

## §14 — Mobile responsive pass

**Priority:** LOW — do last, after §§1–13 widgets exist.

**What it does:** audit every toolkit page and widget for phone viewport (~380px) issues and fix broken layouts.

**Known suspects:**
- Stats grid (`role-stats-widget.tsx` / `stats-dashboard.tsx`) — likely 4-column on mobile.
- Two-column dashboard grid (`toolkit-dashboard.tsx`).
- Recurring timeline layout.
- Any new widgets from §§1–13 (re-audit at the end).

**Design notes:**
- Use the `mobile-check` skill if invoking Cody.
- Test on an actual phone during a meeting — that's the true use case.

**Done when:** every toolkit page is usable and legible at 380px width with no horizontal scroll.

---

## Appendix A — Constitutional references

Key sections of the Hen & Ink constitution that inform toolkit design:

- **Article VIII** (Absence policies) — voting-rights revocation, 3-meeting minimum, consecutive-month membership loss. Drives §11.
- **Article X** (Officers) — each role's formal duties; the toolkits should cover every duty listed. Drives §1 content.
- **Article XI** (Elections) — first week of April; toolkit handoff flows should key off this date.
- **Article XII** (Discipline/removal) — formal procedures that belong in President/Secretary SOPs (§10).
- **Article XIV** (Committees) — Chicken Scratch Creation Committee. Committee toolkits are out of scope here, but the President oversees proofreading (affects their toolkit).
- **Article XVI** (The Zine) — publication schedule, content rules, submission guidelines. Drives the cycle header in §3.
- **Article XVIII** (Quorum) — half of current members present for financial business. Treasurer's toolkit should surface this before any financial vote.

## Appendix B — Out of scope (for now)

Explicitly not included in this overhaul:
- Committee-role toolkits (Editor-in-Chief, Submissions Coordinators, Proofreaders, Circulation Curator).
- Auto-posting integrations (PR content calendar is drafting/scheduling only).
- Email digest / notification routing refinement (exists separately).
- Officer election running software (handled by Google Forms per Article XI).
- Predecessor handoff archive UI — revisit after §10 ships; may already be covered by the SOP library.
