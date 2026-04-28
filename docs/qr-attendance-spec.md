# QR Code Attendance Tracker — Cody Task Doc

## Overview

Add a self-service attendance check-in system to chickenscratch.me. One static QR code printed in the meeting room links to `/attend`. Members scan → authenticate → tap check-in. Officers get a dashboard at `/officers/attendance` with monthly attendance data, at-risk member flags, and manual override capability.

**Constitutional context (Article VIII):** Members must attend ≥3 group meetings/month to keep voting rights. Two consecutive months below minimum = membership revoked. This system replaces manual attendance tracking.

---

## Patch 1: Database — `groupMeetingCheckins` table

### New schema in `src/lib/db/schema.ts`

```ts
export const groupMeetingCheckins = pgTable('group_meeting_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  member_id: uuid('member_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  meeting_date: timestamp('meeting_date', { withTimezone: true }).notNull(), // store as start-of-day UTC
  checked_in_at: timestamp('checked_in_at', { withTimezone: true }).defaultNow().notNull(),
  recorded_by: uuid('recorded_by').references(() => profiles.id), // null = self check-in, uuid = officer manual override
  notes: text('notes'), // officer can add context on manual entries (e.g., "forgot phone")
}, (table) => [
  index('group_checkins_member_id_idx').on(table.member_id),
  index('group_checkins_meeting_date_idx').on(table.meeting_date),
  unique('group_checkins_member_date_key').on(table.member_id, table.meeting_date),
]);
```

### Migration

Generate with `npx drizzle-kit generate` and apply with `npx drizzle-kit push` (or `migrate` depending on current workflow).

### Design notes

- **No meeting entity needed.** Check-ins are tracked by date. The constitutional rules only care about monthly counts, so a per-date record is the right granularity.
- **`meeting_date` stores the calendar date as start-of-day timestamp.** When inserting, normalize to midnight ET (or UTC — just be consistent). The unique constraint on `(member_id, meeting_date)` prevents double check-ins.
- **`recorded_by` distinguishes self vs. officer override.** null = member scanned the QR themselves. A profile UUID = an officer added this manually.
- **No restriction on which days or times.** Any day is valid. Officers manage exceptions via the dashboard.

---

## Patch 2: Server Actions — `src/lib/actions/attendance.ts`

Create a new file with these server actions:

### `checkIn()`

- Guard: `requireMemberRole()` — must be a logged-in member
- Logic:
  1. Get current user's profile ID
  2. Compute today's date (normalize to start-of-day, use America/New_York timezone)
  3. Try insert into `groupMeetingCheckins` with `member_id`, `meeting_date`, `recorded_by: null`
  4. If unique constraint violation → return `{ success: true, alreadyCheckedIn: true }`
  5. On success → return `{ success: true, alreadyCheckedIn: false }`
- Return type: `{ success: boolean; alreadyCheckedIn: boolean; error?: string }`

### `manualCheckIn(memberId: string, dateStr: string, notes?: string)`

- Guard: `requireOfficerRole()`
- Logic:
  1. Parse `dateStr` as a date, normalize to start-of-day
  2. Validate `memberId` exists in profiles and is a member
  3. Insert into `groupMeetingCheckins` with `recorded_by` = officer's profile ID
  4. Handle unique constraint (already checked in for that date)
- Return type: `{ success: boolean; alreadyCheckedIn: boolean; error?: string }`

### `removeCheckIn(checkinId: string)`

- Guard: `requireOfficerRole()`
- Logic: Delete the row. Return success/failure.
- Use case: Officer corrects a mistake.

### `getMonthlyAttendance(year: number, month: number)`

- Guard: `requireOfficerRole()`
- Logic:
  1. Query all check-ins where `meeting_date` falls in the given month
  2. Join with `profiles` to get member names
  3. Also query `userRoles` to get the list of all current members
  4. Return a structure like:
  ```ts
  type MonthlyAttendance = {
    members: {
      id: string;
      name: string;
      isOfficer: boolean;
      checkins: { date: string; selfCheckin: boolean }[];
      totalThisMonth: number;
      status: 'on_track' | 'at_risk' | 'below_threshold';
    }[];
    month: number;
    year: number;
  };
  ```
  5. Status logic:
     - `on_track`: ≥3 check-ins this month, OR enough days remaining to hit 3
     - `at_risk`: <3 check-ins AND fewer than (3 - current count) meeting opportunities remaining in the month
     - `below_threshold`: month is over AND <3 check-ins

### `getMemberAttendanceSummary(memberId: string)`

- Guard: `requireMemberRole()` — member can see their own, officers can see anyone's
- Returns: check-in count for current month, last 3 months, and list of check-in dates

---

## Patch 3: Check-In Page — `/attend`

### Route: `src/app/attend/page.tsx`

This is the page the QR code points to. **Mobile-first design** — this will almost always be scanned on a phone.

### Behavior

1. **Not logged in** → Redirect to `/login?next=/attend`
2. **Logged in but not a member** → Friendly message: "You need to be a member of Hen & Ink Society to check in. Talk to an officer at the meeting!"
3. **Already checked in today** → Show confirmation state with checkmark, the time they checked in, and their monthly count so far
4. **Ready to check in** → Show a big, satisfying "Check In" button

### UI spec

- **Brand colors**: Ink Gold (#FFD200) background accents, Hen Blue (#00539F) primary
- **Layout**: Centered card, mobile-optimized (this is a phone scan flow)
- **States:**
  - **Loading**: Skeleton or spinner while checking status
  - **Check-in available**: Big button, today's date displayed, monthly progress indicator (e.g., "2 of 3 check-ins this month")
  - **Success**: Animated checkmark (chicken footprint stamp?), confetti optional, monthly count updates
  - **Already checked in**: Calm confirmation — "You're checked in for today ✓" with timestamp
  - **Not a member**: Clear message with no check-in button
- **After check-in**: Show the member's current month attendance count (e.g., "3/3 — you're all set this month! 🐔")
- **No meeting-day restrictions.** The button is always available.

### Implementation notes

- Use `requireUser('/attend')` for auth, then check `is_member` from `userRoles`
- Server component for initial load, client component for the check-in button interaction
- The check-in action should use `useTransition` or similar for optimistic UI
- After successful check-in, revalidate the page data

---

## Patch 4: Officer Attendance Dashboard — `/officers/attendance`

### Route: `src/app/officers/attendance/page.tsx`

### Guard: `requireOfficerRole()`

### Layout

Add a link to the existing officers sidebar/nav if one exists. Otherwise, this page is accessed directly.

### Features

#### Monthly Attendance Grid

- **Columns**: Dates of the month (just the days that have at least one check-in)
- **Rows**: All current members
- **Cells**: ✓ (self check-in) or 🔧 (officer override) or empty
- **Row summary**: Total check-ins for the month
- **Month picker**: Navigate between months

#### Status Badges per Member

- 🟢 **On Track**: ≥3 check-ins this month
- 🟡 **At Risk**: <3 check-ins, running out of time
- 🔴 **Below Threshold**: Month ended with <3

#### Consecutive Month Tracking

- Flag members who are below threshold for 2+ consecutive months (constitutional removal trigger per Article VIII)
- Visual indicator: "⚠️ 2 consecutive months below minimum"

#### Manual Check-In Form

- Officer selects a member from a dropdown (populated from `userRoles` where `is_member = true`)
- Picks a date (defaults to today)
- Optional notes field
- Submit → calls `manualCheckIn()` server action
- The entry appears in the grid with the 🔧 indicator

#### Manual Removal

- Officers can click an existing check-in to remove it (with confirmation)
- Calls `removeCheckIn()` server action

### UI spec

- Table/grid component — could use a simple HTML table with sticky headers
- Responsive: on mobile, maybe switch to a per-member card view instead of wide grid
- Filter: "Show all" / "Show at-risk only"
- Export: Nice-to-have — download CSV of monthly attendance for records

---

## Patch 5: Member Self-View — attendance on `/mine`

### Location: Extend the existing `/mine` page (or add a tab/section)

### Features

- Show the member's own attendance for the current month
- Simple list of check-in dates with a progress indicator
- "X of 3 minimum check-ins this month"
- Link to the full attendance history (last 3 months)

### Guard: `requireMemberRole()`

---

## Patch 6: QR Code Generation (one-time)

### Approach

Generate a single QR code image pointing to `https://chickenscratch.me/attend` and save it as a static asset.

### Options (pick one):

1. **Generate at build time** — Add a script in `scripts/generate-qr.ts` using `qrcode` npm package. Output to `public/attend-qr.png`. Run once.
2. **Generate on-demand in an admin page** — Add a small section to an existing officer/admin page that renders the QR code client-side using a library like `qrcode.react` and lets officers download it.

**Recommendation: Option 2** — gives officers the ability to regenerate if the domain ever changes, and they can download/print directly from the portal.

### Implementation (Option 2)

- Add a "Print QR Code" card to the `/officers/attendance` dashboard
- Use `qrcode.react` (`npm install qrcode.react`)
- Render QR code pointing to `https://chickenscratch.me/attend`
- Include the H&I logo centered in the QR code (cosmetic, use the logo PNG)
- "Download as PNG" button
- "Print" button (triggers `window.print()` with a print-friendly layout)
- Suggested print size: 4×4 inches minimum for reliable phone scanning

---

## File Inventory (what Cody creates/modifies)

### New files

| File | Purpose |
|------|---------|
| `src/lib/actions/attendance.ts` | Server actions: checkIn, manualCheckIn, removeCheckIn, getMonthlyAttendance, getMemberAttendanceSummary |
| `src/app/attend/page.tsx` | Public check-in page (QR landing) |
| `src/app/officers/attendance/page.tsx` | Officer attendance dashboard |
| `src/components/attendance/CheckInButton.tsx` | Client component for the check-in interaction |
| `src/components/attendance/AttendanceGrid.tsx` | Monthly attendance grid component |
| `src/components/attendance/ManualCheckIn.tsx` | Officer manual check-in form |
| `src/components/attendance/QrCodeCard.tsx` | QR code display + download for officers |
| `src/components/attendance/MemberAttendanceSummary.tsx` | Self-view attendance widget for /mine |
| Migration file | Generated by drizzle-kit |

### Modified files

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add `groupMeetingCheckins` table |
| `src/app/mine/page.tsx` (or relevant sub-page) | Add attendance summary section |
| Officers nav (if exists) | Add "Attendance" link |

### New dependency

```
npm install qrcode.react
```

---

## Implementation Order

1. **Patch 1** — Schema + migration (everything else depends on this)
2. **Patch 2** — Server actions (backend logic, testable independently)
3. **Patch 3** — `/attend` check-in page (the core user-facing feature)
4. **Patch 4** — Officer dashboard (reporting + manual override)
5. **Patch 5** — Member self-view on `/mine`
6. **Patch 6** — QR code generation card on dashboard

Patches 3-6 can be parallelized after 1+2 are done, but the listed order is the recommended priority.

---

## Edge Cases & Notes

- **Timezone**: Normalize `meeting_date` to America/New_York. A member who scans at 11:55 PM should get credit for that day, not the next.
- **Duplicate prevention**: The unique constraint `(member_id, meeting_date)` is the source of truth. Handle the constraint violation gracefully in the server action — it's not an error, it's an "already checked in" state.
- **Alumni**: `is_member` check should exclude alumni (`is_alumni = true` but `is_member = false`). Alumni shouldn't be able to check in.
- **Profile creation**: The existing `ensureProfile()` flow handles Clerk → profile mapping. No changes needed.
- **Rate limiting**: The existing `rate-limit.ts` pattern should be applied to the `checkIn()` action to prevent abuse (e.g., 10 requests/minute per user).
- **Audit trail**: `recorded_by` on each check-in provides a built-in audit trail for manual overrides. No need for a separate audit log entry.
- **No meeting-day enforcement**: The system allows check-ins on any day. If the club later wants to restrict to specific days, add a `siteConfig` entry for `meeting_days` and validate against it in the `checkIn()` action. But don't build this now.
