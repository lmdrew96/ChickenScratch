-- Reseed the SOP library from the four role reference docs in /docs
-- (toolkit overhaul §10 follow-up). The previous 15 thin seeds from
-- 0023 get replaced with 7 comprehensive articles sourced from
-- docs/officer-*.md.
--
-- Safety: Phase 1 only deletes seeds that have not been edited by a
-- human (updated_by IS NULL). Any seed an officer has touched survives.
-- Phase 2 uses ON CONFLICT DO NOTHING so re-running the migration won't
-- clobber post-seed edits.

-- =========================================================================
-- Phase 1: drop untouched 0023 seeds
-- =========================================================================

DELETE FROM sop_articles
WHERE updated_by IS NULL
  AND (role_slug, slug) IN (
    ('treasurer', 'chicken-scratch-printing-reimbursement'),
    ('treasurer', 'out-of-pocket-vs-purpose-code'),
    ('treasurer', '24-hour-cash-deposit-rule'),
    ('treasurer', 'email-receipt-policy'),
    ('treasurer', 'allocation-board-increase'),
    ('secretary', 'voting-rights-article-viii'),
    ('secretary', 'minutes-format-discord-archival'),
    ('secretary', 'member-removal-article-xii'),
    ('pr-chair', 'brand-assets'),
    ('pr-chair', 'content-rhythm'),
    ('pr-chair', 'issue-distribution-checklist'),
    ('president', 'rso-reregistration-checklist'),
    ('president', 'faculty-advisor-cadence'),
    ('president', 'election-process-article-xi'),
    ('president', 'officer-removal-article-xii')
  );

-- =========================================================================
-- Phase 2: insert the 7 role-doc-sourced articles
-- =========================================================================

INSERT INTO sop_articles (role_slug, slug, title, body_md, tags, is_draft)
VALUES

-- --------------------------------------------------------------------
-- PRESIDENT — Role Reference
-- --------------------------------------------------------------------
(
  'president',
  'role-reference',
  'President — Role Reference',
  $md$## Role Overview

- **Official Title:** President
- **Informal Title:** BBEG (Big Bad Evil Gamemaster)
- **Current Holder:** Mia
- **Term:** One full academic year (per Article IX)
- **Elected:** First week of April during Spring Semester (per Article XI)

---

## Qualifications (Article IX)

To hold the President role, a member must be:

- A full-time matriculated undergraduate student at the University of Delaware
- Minimum GPA of **2.5**
- Able to complete a full academic year in the role

---

## Constitutional Duties (Article X.1.a)

### Primary Responsibilities

1. **Lead group meetings** — runs the twice-weekly common-hour meetings
2. **Organize and lead creative writing activities** for group meetings
3. **Oversee proofreading and editing of _Chicken Scratch_**
4. **Cast the deciding vote** in the event of an evenly split vote among members
5. **Complete registration and required paperwork** for the continuation of the organization (RSO recognition with UD)
6. **Oversee/moderate the _word nerds!_ Discord server**

### Hard Restriction

> **The President may not simultaneously hold the position of Treasurer.** (Article X.1.a.vii)

---

## UD-Facing Responsibilities

The President is the primary point of contact between Hen & Ink Society and the University for organizational/administrative matters.

### Key UD Contacts

| Contact | Role | How They Help the President |
|---|---|---|
| **Jessica Landow** (landow@udel.edu, 302-831-2186, 015C Perkins) | Primary SIO (Student Involvement Office) contact | RSO registration, constitution filing, general org continuity questions |
| **Lindsey Massey** | AAP Student Support & Engagement Coordinator | Coordination for AAP satellite campus (Georgetown) specifics |
| **Dr. Colwell/Caldwell** | Faculty Advisor | Monthly advisor meetings; org stability, advocacy, approvals |
| **Stephanie** | Georgetown room reservations | Booking meeting spaces at the Georgetown campus |

### Registration & Continuation Paperwork

> **[PENDING FROM MIA]** Mia will provide a transcript of the yearly President training (similar to what Nae has for the Treasurer training). Once received, this section should be updated with the actual training content and paperwork requirements.

### Context for the training

- The **yearly President/Treasurer training** is the gate to the full $800 GOB tier (Fall cycle)
- Training is run through SIO — Jessica Landow is the primary contact

### Constitution & Governance Filings

- **Yearly constitution review** happens at end of Spring semester (Article XIX)
- Amendments require **2/3 majority vote** of entire membership + 24-hour advance notice (Article XXI)
- Ratified constitution must be approved by the Student Involvement Office (Article XX)

---

## Internal Responsibilities (Club-Level)

### Meeting Leadership

- **Twice-weekly group meetings** during common hour (Article VII.1)
- Runs creative writing activities and exercises
- Sets tone and pace of meetings

### Chicken Scratch Oversight

- Coordinates with the **Editor-in-Chief** (Chicken Scratch Creation Committee) on proofreading and editorial quality
- Does **not** make final editorial decisions — that authority rests with the Editor-in-Chief (Article XVI.3)
- Helps resolve disputes when content guidelines are ambiguous

### Discord Moderation

- Oversees the _word nerds!_ Discord server
- All four officers moderate, but the President has final authority on server-level decisions
- Coordinates with PR Chair on channel consolidation (Discord is being established as primary communication channel)

### Tie-Breaker Authority

- In an evenly split member vote, the President casts the deciding vote
- **Exception:** President cannot use tie-breaker on their own removal (Article XII.1.1)

---

## Attendance Requirements (Article X.2)

### Group Meetings

- **Required to attend all group meetings** unless notifying other officers **at least 2 hours in advance**
- Exception: emergencies waive advance-notice requirement

### Excused Absences

Automatically excused: school-sponsored events, school-related jobs, exams, transportation issues, emergencies, illness, bereavement.

### Removal Triggers from Attendance

| Threshold | Consequence |
|---|---|
| 3 unexcused absences from group meetings per semester | Members vote on removal |
| Each additional absence after vote-to-keep | Another removal vote |
| 6+ unexcused absences per semester | **Immediate removal, no vote** |
| 2+ absences from officer meetings per semester | **Immediate removal, no vote** |
| 2+ absences from advisor meetings per semester | **Immediate removal, no vote** |

---

## Removal Procedures (Article XII.1.1)

If the President is being removed:

1. Removal notification goes to the **Treasurer** (since the President normally receives these reports)
2. Treasurer has **5 business days** to call a mandatory group meeting
3. President is notified at least **72 hours before** the meeting
4. At the meeting, President gets to speak and defend themselves
5. Members ask questions
6. **Anonymous vote** via checkmarks and crosses
7. **2/3 majority** of active student members required to remove
8. If removed, President must return all club property within **72 hours**
9. SIO is notified immediately of the change

---

## Working with Other Officers

### Treasurer (Nae)

- **Major operational partner** — most big decisions are coordinated between President and Treasurer
- Treasurer leads meetings in President's absence
- Joint responsibility for club stability and continuity

### Secretary (Scroll Gremlin)

- Meeting minutes feed back to President for review
- Attendance tracking flows through Secretary → President for enforcement decisions

### PR Chair (PR Nightmare)

- Coordinates event promotion with President's event planning
- Content Playbook provides autonomy — President doesn't need to micromanage posting

---

## Officer Meetings

- **Officer meetings:** every two weeks, at officers' discretion (Article VII.2)
- **Advisor meetings:** once a month with faculty advisor (Article VII.3)

---

## Quick Reference: When to Use the President

✅ **President handles:**

- RSO registration & continuation paperwork
- Constitution review/amendments
- Tie-breaker votes
- Meeting leadership
- Officer coordination
- SIO communication for org-level matters
- Final authority on Discord server-level decisions
- Advisor relationship management

❌ **President does NOT handle (directly):**

- Final editorial decisions on _Chicken Scratch_ (Editor-in-Chief's call)
- Financial ledger / reimbursements (Treasurer)
- Meeting minutes / attendance records (Secretary)
- Social media / flyer production (PR Chair)
- Treasurer role itself (prohibited by constitution)
$md$,
  ARRAY['reference', 'president'],
  false
),

-- --------------------------------------------------------------------
-- TREASURER — Role Reference
-- --------------------------------------------------------------------
(
  'treasurer',
  'role-reference',
  'Treasurer — Role Reference',
  $md$## Role Overview

- **Official Title:** Treasurer
- **Informal Title:** Dictator-in-Chief
- **Current Holder:** Nae
- **Term:** One full academic year (per Article IX)
- **Elected:** First week of April during Spring Semester (per Article XI)

---

## Qualifications (Article IX)

- Full-time matriculated undergraduate student at the University of Delaware
- Minimum GPA of **2.5**
- Able to complete a full academic year

---

## Constitutional Duties (Article X.1.b)

1. **Lead group meetings in the absence of the President**
2. **Organize and deliver announcements** at group meetings
3. **Maintain a ledger** of all group expenditures and revenues
4. **Submit all reimbursements** to the Student Involvement Office (SIO)
5. **Request funds** from the allocation board when needed
6. **Coordinate fundraisers and other events**
7. ~~**Oversee rental of advertising space** for _Chicken Scratch_~~ ⚠️ **NOT CURRENTLY OPERATIONAL** — see note below
8. **Moderate the _word nerds!_ Discord server**

### ⚠️ Constitutional vs. Operational Conflict

> The constitution (Article X.1.b.vii and Article XIV.1.b.ii.4) references advertising space rental in _Chicken Scratch_. **In practice, Hen & Ink cannot sell advertising in _Chicken Scratch_.** This is a real operational constraint that conflicts with the constitution and should be addressed in the annual Article XIX constitution review.

### Hard Restriction

> **The Treasurer may not simultaneously hold the position of President.** (Article X.1.a.vii)

---

## Budget Overview

### GOB Cycle Rules

- **Fall requests:** Up to **$800** maximum
- **Spring requests:** Up to **$400** maximum
- **Current cycle:** $400 allocated (requested in Spring) — to access the $800 tier, request in a Fall cycle

### Required Trainings

- **Yearly President and Treasurer training** — this is the only required training to access the full GOB
- There is no separate "recognition + additional trainings" pathway — the yearly training is the gate

### Chicken Scratch Printing

- Printing is done at the **public library** — NOT UD services
- Because of this, the **internal account / purpose code reimbursement flow does NOT apply**
- Printing costs go through the **out-of-pocket expense process** (see _Treasurer — Financial Processes & Workflows_)

---

## Internal Responsibilities (Club-Level)

### Meeting Leadership

- **Lead group meetings when the President is absent**
- **Deliver announcements** at every group meeting
- Coordinate fundraiser logistics

### Chicken Scratch — Advertising Space (Non-Operational)

> ⚠️ **The constitution lists this duty but it cannot be practiced.** Hen & Ink cannot sell advertising in _Chicken Scratch_. Flag this for the Article XIX annual constitution review — the Treasurer duty (Article X.1.b.vii) and Submissions Coordinator duty (Article XIV.1.b.ii.4) should likely be removed or reworded.

### Fundraisers & Events

- Coordinate fundraisers to supplement the GOB
- Works with PR Chair on event promotion
- Works with President on event planning logistics

### Discord Moderation

- Moderate the _word nerds!_ Discord server alongside other officers

---

## Upcoming / Active Work

- [ ] Confirm receipt/reimbursement policy interpretation with Jessica or Suzanne (email receipts as originals)
- [ ] Track Chicken Scratch printing expenses with correct workflow (out-of-pocket, not internal)
- [ ] Complete the yearly President/Treasurer training (prerequisite for GOB access)
- [ ] Plan timing: if the club wants the $800 tier, request must land in a **Fall** cycle
- [ ] Upcoming events requiring budget tracking:
  - Bookmark-making event (April 9)
  - Larger event (May 1)
  - Tabling at Next Stop Newark

---

## Attendance Requirements (Article X.2)

### Group Meetings

- **Required to attend all group meetings** unless notifying other officers **at least 2 hours in advance** (emergencies exempt)

### Excused Absences

School-sponsored events, school-related jobs, exams, transportation issues, emergencies, illness, bereavement.

### Removal Triggers from Attendance

| Threshold | Consequence |
|---|---|
| 3 unexcused absences from group meetings per semester | Members vote on removal |
| Each additional absence after vote-to-keep | Another removal vote |
| 6+ unexcused absences per semester | **Immediate removal, no vote** |
| 2+ absences from officer meetings per semester | **Immediate removal, no vote** |
| 2+ absences from advisor meetings per semester | **Immediate removal, no vote** |

---

## Removal Procedures (Article XII.1.1)

If the Treasurer is removed:

1. Notification goes to the **President**
2. President has **5 business days** to call a mandatory group meeting
3. Treasurer notified at least **72 hours before**
4. Treasurer gets to speak and defend; members can ask questions
5. **Anonymous 2/3 majority** required to remove
6. If removed: return all club property within **72 hours**
7. **SIO must be notified immediately** (Treasurer changes are high-priority because of financial authority)

---

## Working with Other Officers

### President (Mia)

- **Primary operational partner** — most major decisions coordinated between President and Treasurer
- Treasurer fills in when President is absent

### Secretary (Scroll Gremlin)

- Secretary tracks attendance; Treasurer references this for quorum on financial votes (Article XVIII: **at least half of all current members must be present** for any financial business)

### PR Chair (PR Nightmare)

- Coordinates fundraiser promotion
- Advertising space decisions feed into PR's distribution of _Chicken Scratch_

---

## Quorum for Financial Business (Article XVIII)

> **At least half of all current members must be present at a meeting for any financial business to be conducted legally.**

This applies to:

- Approving major expenditures
- Approving fundraiser decisions
- Budget allocations beyond standing approvals

---

## Quick Reference: When to Use the Treasurer

✅ **Treasurer handles:**

- All financial transactions
- Ledger maintenance
- Reimbursements (both UD internal and out-of-pocket)
- Request for Check Forms
- SIO financial communication (Jessica, Suzanne)
- GOB requests
- Fundraiser coordination
- Chicken Scratch advertising space
- Cash deposits (24-hr rule)
- Announcements at meetings
- Leading meetings when President is absent

❌ **Treasurer does NOT handle (directly):**

- Final editorial decisions on _Chicken Scratch_
- Meeting minutes / attendance records (Secretary)
- Social media / promotional design (PR Chair)
- Constitution amendments (President-led)
- President role itself (prohibited by constitution)
$md$,
  ARRAY['reference', 'treasurer'],
  false
),

-- --------------------------------------------------------------------
-- TREASURER — UD Contact Directory
-- --------------------------------------------------------------------
(
  'treasurer',
  'ud-contacts',
  'Treasurer — UD Contact Directory',
  $md$The Treasurer is the primary financial liaison between Hen & Ink and the University. This is the most UD-interaction-heavy role — keep this list close.

## Key UD Contacts

| Contact | Role | What They Handle |
|---|---|---|
| **Jessica Landow** (landow@udel.edu, 302-831-2186, 015C Perkins) | Primary SIO Contact | Reimbursement policy questions, general RSO finance, receipt interpretation |
| **Suzanne Nelson** | SIO — Ledger, Audits, Purpose Codes | Ledger format, audit prep, purpose code questions |
| **Gab & Karen** | Business Admin | Contracts and billing |
| **Alex Heen/Keane** | GOB Approvals | General Operating Budget approvals; travel over 350 miles |
| **Lindsey Massey** | AAP Student Support & Engagement Coordinator | AAP-specific coordination (Georgetown campus) |
| **Dr. Colwell/Caldwell** | Faculty Advisor | Reviews and approves financial transactions, budgets, funding requests (Article XV.1.c) |

## Who to call for what

- **Receipt-acceptability questions** (email vs. original, language) → Jessica Landow
- **Ledger format and audit prep** → Suzanne Nelson
- **Purpose codes** → Suzanne Nelson
- **GOB approval (Fall $800 / Spring $400 requests)** → Alex Heen/Keane (after faculty advisor sign-off)
- **Travel over 350 miles** → Alex Heen/Keane
- **Georgetown campus logistics** → Lindsey Massey
- **Any financial transaction needing advisor approval** → Dr. Colwell/Caldwell (Article XV.1.c)
- **Contracts and billing with vendors** → Gab & Karen (Business Admin)

## Approval sequences

- **GOB requests:** Dr. Colwell/Caldwell (faculty advisor) approves **first**, then SIO.
- **Officer-removal notifications involving the Treasurer:** President → SIO (immediate, because of financial authority).
$md$,
  ARRAY['contacts', 'sio', 'reference'],
  false
),

-- --------------------------------------------------------------------
-- TREASURER — Financial Processes & Workflows
-- --------------------------------------------------------------------
(
  'treasurer',
  'financial-workflows',
  'Treasurer — Financial Processes & Workflows',
  $md$## 1. Ledger Maintenance

- **Format:** Shared **Google Sheets**, provided by **Suzanne Nelson** (SIO)
- Track **all expenditures and revenues**
- Ledger entries should only be added **after** receiving the approval email with check number (for reimbursements)
- Contact **Suzanne Nelson** for ledger format questions, purpose code questions, or audit prep

## 2. Reimbursement Workflow — Out-of-Pocket Expenses

Applies to any out-of-pocket expense where you paid and need reimbursement — notably **_Chicken Scratch_ printing at the public library**.

**Required:**

- ✅ **Request for Check Form**
- ✅ **Itemized PDF receipt**
- ✅ Receipt must be **less than 45 days old**
- ✅ Wait for approval email with check number **before** making ledger entry

## 3. Receipt Compliance

- **Email receipts** are **likely acceptable** if they are:
  - Itemized
  - Saved as PDF
  - Complete (all required info present)
- ⚠️ **TODO:** RSO policy uses "original" language that may conflict — **confirm interpretation with Jessica Landow or Suzanne Nelson** before relying on email receipts exclusively.

## 4. Cash Donation Handling

> **24-hour deposit rule:** Any cash donations received must be deposited within 24 hours. No exceptions.

> **Account:** Cash donations deposit into **the same UD account as the GOB.** In the GOB tracker this means donations extend the effective ceiling — a $400 GOB with $60 in donations reads as $460 available.

Workflow:

1. At the meeting, record the cash donation in the Ledger Entry form with **payment method = Cash**.
2. Within 24 hours, deposit at SIO or a Blue Hen Pavilion drop-safe.
3. Return to the treasurer toolkit and click **"Mark deposited"** on the donation row under Compliance Alerts.

The Compliance Alerts widget counts down the 24-hour window and flips red when the deposit is overdue. Don't dismiss the alert until the deposit is actually made.

## 5. Travel Expenses

- Routine travel: standard reimbursement flow.
- **Travel over 350 miles:** Requires approval from **Alex Heen/Keane** (GOB channel).

## 6. GOB Requests

- Submit to the **allocation board**.
- **Approval sequence:** Dr. Colwell/Caldwell (faculty advisor) approves **first**, then SIO.
- Maximum amounts depend on cycle (Fall = $800 max, Spring = $400 max).
- Prerequisite: Complete the yearly President/Treasurer training.
- Coordinate with **Alex Heen/Keane** for approvals.
- When a new ceiling is approved, update `site_config.gob_budget_dollars` in the admin panel so the GOB tracker reflects it.
$md$,
  ARRAY['finance', 'reimbursement', 'gob', 'workflow'],
  false
),

-- --------------------------------------------------------------------
-- SECRETARY — Role Reference
-- --------------------------------------------------------------------
(
  'secretary',
  'role-reference',
  'Secretary — Role Reference',
  $md$## Role Overview

- **Official Title:** Secretary
- **Informal Title:** Scroll Gremlin
- **Current Holders:** **Ashley** and **Xavier** (co-secretaries — splitting the role)
- **Term:** One full academic year (per Article IX)
- **Elected:** First week of April during Spring Semester (per Article XI)

> ⚠️ **Constitutional vs. Operational Conflict:** The constitution (Article X.1.c) defines a **single** Secretary role. In practice, Ashley and Xavier share it. Flag this for the Article XIX annual constitution review — the duties may need to be formally split, or the constitution updated to allow co-secretaries.

---

## Qualifications (Article IX)

- Full-time matriculated undergraduate student at the University of Delaware
- Minimum GPA of **2.5**
- Able to complete a full academic year

---

## Constitutional Duties (Article X.1.c)

1. **Record events and maintain minutes** of all group meetings
2. **Maintain membership list and email database**
3. **Oversee digital and print archives** of _Chicken Scratch_
4. **Take and keep attendance records** at group meetings
5. **Maintain the "meeting-minutes" channel** on the _word nerds!_ Discord server
6. **Moderate the _word nerds!_ Discord server**

---

## Responsibilities in Detail

### 1. Meeting Minutes

- **Format:** Shared **Google Doc**
- **Location:** Pinned in the **#meeting-minutes** channel on the _word nerds!_ Discord server
- Attend every group meeting (twice weekly during common hour)
- Record key decisions, discussions, votes, and action items
- A consistent template should include:
  - Date / attendees / quorum status
  - Agenda items discussed
  - Decisions made + vote counts
  - Action items with owners
  - Next meeting date

### 2. Membership List & Email Database

- **Active membership tracking** — who counts as an active member?
  - Per Article III.2: must attend **3+ meetings/month** AND submit **1+ creative work/semester**
- Update list when members join or lose membership (2 consecutive months below attendance minimum per Article VIII.2)
- Maintain current email contacts for:
  - Announcements
  - Voting (officer elections, major decisions)
  - Chicken Scratch distribution

### 3. Chicken Scratch Archives

- **Digital archive locations:**
  - **chickenscratch.me** (public-facing PDF flipbook display)
  - **Nae's personal computer** (source files and long-term archive)
- **Print archive:** Physical copies preserved
- Coordinates with the **Circulation Curator** (Chicken Scratch Creation Committee) who maintains the semester's current-issue archive
- Works with **PR Chair (Vienna)** on distribution records

> **Future state:** If the chickenscratch.me admin menu expands, archive files currently on Nae's computer could be uploaded to the platform for centralized access.

### 4. Attendance Tracking

- Take attendance at **every** group meeting
- Used for:
  - Member voting rights enforcement (Article VIII.1 — lose voting rights if under 3/month)
  - Removing inactive members (Article VIII.2 — 2 consecutive months below minimum = removal)
  - Quorum calculation for financial votes (Article XVIII — half of current members must be present)

### 5. Discord Meeting-Minutes Channel

- Keep the meeting-minutes channel current and organized
- Archive older minutes thoughtfully (pin important ones; avoid clutter)

### 6. Discord Moderation

- One of four officers moderating the _word nerds!_ server

---

## Attendance Requirements (Article X.2)

### Group Meetings

- **Required to attend all group meetings** — because the Secretaries _are_ the minute-takers, attendance is especially critical
- Notify other officers **at least 2 hours in advance** if absent (emergencies exempt)
- With co-secretaries (Ashley and Xavier), coverage for minute-taking is built in — one can cover if the other is absent

### Excused Absences

School-sponsored events, school-related jobs, exams, transportation issues, emergencies, illness, bereavement.

### Removal Triggers from Attendance

| Threshold | Consequence |
|---|---|
| 3 unexcused absences from group meetings per semester | Members vote on removal |
| Each additional absence after vote-to-keep | Another removal vote |
| 6+ unexcused absences per semester | **Immediate removal, no vote** |
| 2+ absences from officer meetings per semester | **Immediate removal, no vote** |
| 2+ absences from advisor meetings per semester | **Immediate removal, no vote** |

---

## Removal Procedures (Article XII.1.1)

Same process as any officer removal:

1. Notification goes to **President**
2. President has **5 business days** to call mandatory group meeting
3. Secretary notified **72+ hours before**
4. Secretary gets to speak and defend
5. **Anonymous 2/3 majority** required to remove
6. Must return all club property within **72 hours** if removed

---

## Working with Other Officers

### President (Mia)

- Minutes → President for record of decisions and action items
- Attendance reports → President for enforcement decisions

### Treasurer (Nae)

- Attendance records → Treasurer for quorum verification on financial votes

### PR Chair (PR Nightmare)

- Email database → PR for distribution lists
- Archive records → PR for historical content reference

### Chicken Scratch Creation Committee

- **Circulation Curator** coordinates on current-semester archive
- Secretary maintains long-term archive (past semesters)

---

## Quick Reference: When to Use the Secretary

✅ **Secretary handles:**

- Meeting minutes
- Attendance records
- Active membership list
- Email database
- Chicken Scratch long-term archives
- Discord meeting-minutes channel

❌ **Secretary does NOT handle (directly):**

- Financial records (Treasurer)
- Promotional content (PR Chair)
- Editorial decisions (Editor-in-Chief)
- Tie-breaker votes (President)
- Current-semester zine archive (Circulation Curator handles this, Secretary handles long-term)
$md$,
  ARRAY['reference', 'secretary'],
  false
),

-- --------------------------------------------------------------------
-- PR CHAIR — Role Reference
-- --------------------------------------------------------------------
(
  'pr-chair',
  'role-reference',
  'PR Chair — Role Reference',
  $md$## Role Overview

- **Official Title:** Public Relations Chair
- **Informal Title:** PR Nightmare
- **Current Holder:** **Vienna**
- **Term:** One full academic year (per Article IX)
- **Elected:** First week of April during Spring Semester (per Article XI)

---

## Qualifications (Article IX)

- Full-time matriculated undergraduate student at the University of Delaware
- Minimum GPA of **2.5**
- Able to complete a full academic year

---

## Constitutional Duties (Article X.1.d)

1. **Promote group meetings and events**
2. **Create and distribute posters, flyers, and brochures**
3. **Promote and distribute _Chicken Scratch_** — both digitally and in print
4. **Create and maintain all social media accounts and webpages** representing the organization
5. **Coordinate contact with media outlets** requesting communication from the organization
6. **Moderate the _word nerds!_ Discord server**

---

## Responsibilities in Detail

### 1. Meeting & Event Promotion

- Regular promo for twice-weekly group meetings
- Major event promotion (bookmark-making event April 9, larger event May 1, tabling at Next Stop Newark)
- Coordinate timing with Treasurer (for events with budget) and President (for event logistics)

### 2. Print Materials

- Design and distribute:
  - Posters (campus bulletin boards, Georgetown AAP spaces)
  - Flyers (for tabling, events)
  - Brochures (recruitment, informational)
- Must follow brand standards (see _PR Chair — Brand Standards_)

### 3. Chicken Scratch Distribution

- **Digital:**
  - Social media posts announcing each issue
  - chickenscratch.me portal integration (PDF flipbook is live)
  - Discord announcements
- **Print:**
  - Physical distribution around campus
  - Coordination with **Circulation Curator** (Chicken Scratch Creation Committee)

### 4. Social Media & Web Presence

- **Active platforms:** **TikTok** and **Instagram**
- Maintain club-facing pages on **chickenscratch.me** (the public-facing submissions/issues portal)
- Brand consistency across every platform

> 🚨 **Active Action Item:** Handles on **TikTok** and **Instagram** currently contain "ud" and **must be changed to remove it**. This is a compliance requirement — student orgs typically can't use "ud" in handles without approval.

### 5. Media Outlet Contact

- First point of contact if any media (UDaily, local press, campus publications) reaches out
- Coordinate quotes and interviews with President when needed

### 6. Discord Moderation

- One of four officers moderating the _word nerds!_ server
- Channel consolidation is in progress — Discord is being established as the **primary communication channel** for the club

---

## Content Playbook

A content playbook was built specifically for the PR Chair role to enable **autonomous, repeatable posting** — so the PR Chair doesn't need to reinvent the wheel every week.

### Core Rhythm

- **Monday / Wednesday / Friday** posting cadence
- **Monthly anchors** — recurring content types tied to the publication cycle

The Content Calendar widget on this toolkit surfaces Mon/Wed/Fri slots for the next three weeks with quick-insert templates (Meet the Flock, issue release, meeting reminder, event promo).

### Current Source Location

- **Nae's personal computer** (source)
- **Discord** (shared with officers)

---

## Attendance Requirements (Article X.2)

### Group Meetings

- **Required to attend all group meetings** unless notifying other officers **2+ hours in advance** (emergencies exempt)

### Excused Absences

School-sponsored events, school-related jobs, exams, transportation issues, emergencies, illness, bereavement.

### Removal Triggers from Attendance

| Threshold | Consequence |
|---|---|
| 3 unexcused absences from group meetings per semester | Members vote on removal |
| Each additional absence after vote-to-keep | Another removal vote |
| 6+ unexcused absences per semester | **Immediate removal, no vote** |
| 2+ absences from officer meetings per semester | **Immediate removal, no vote** |
| 2+ absences from advisor meetings per semester | **Immediate removal, no vote** |

---

## Removal Procedures (Article XII.1.1)

Same process as any officer removal:

1. Notification to **President**
2. President has **5 business days** to call mandatory group meeting
3. PR Chair notified **72+ hours before**
4. PR Chair gets to speak and defend
5. **Anonymous 2/3 majority** required to remove
6. Must return all club property within **72 hours** if removed — this includes **social media account access credentials**

---

## Working with Other Officers

### President (Mia)

- Coordinates on media inquiries requiring official statement
- Event promotion aligned with President's leadership

### Treasurer (Nae)

- Fundraiser promotion
- Advertising space coordination (Treasurer rents ad space in _Chicken Scratch_ — PR Chair helps design layout)

### Secretary (Scroll Gremlin)

- Pulls email database for announcements
- Coordinates long-term archive visibility on web/social

### Chicken Scratch Creation Committee

- **Circulation Curator** reports to both Secretary AND PR Chair
- Coordinates current-issue distribution and social posts

---

## Quick Reference: When to Use the PR Chair

✅ **PR Chair handles:**

- Social media (all accounts)
- Website/chickenscratch.me public-facing content
- Posters, flyers, brochures (design + distribution)
- Media inquiries (first contact, with President loop-in)
- Chicken Scratch promotion and distribution
- Content playbook execution (M/W/F rhythm)
- Brand consistency enforcement

❌ **PR Chair does NOT handle (directly):**

- Editorial decisions on Chicken Scratch content (Editor-in-Chief)
- Financial decisions (Treasurer)
- Meeting minutes or attendance (Secretary)
- Constitution/governance (President)
$md$,
  ARRAY['reference', 'pr'],
  false
),

-- --------------------------------------------------------------------
-- PR CHAIR — Brand Standards
-- --------------------------------------------------------------------
(
  'pr-chair',
  'brand-standards',
  'PR Chair — Brand Standards',
  $md$All PR materials (digital and print) must follow these. They are non-negotiable — the brand reads as **literary, polished, and warm with a handcrafted feel**. Avoid overly corporate/sterile looks.

## Colors

| Color | Hex | Use |
|---|---|---|
| **Ink Gold** | `#FFD200` | Primary brand color; backgrounds, accents |
| **Hen Blue** | `#00539F` | Text, logo strokes, contrast elements |

These are official University of Delaware colors — alignment matters.

## Logo Variants

Two logo variants exist, both transparent-background PNGs:

1. **Gold background / blue linework** — use on dark or colored surfaces (use the blue version of the logo).
2. **Blue background / white linework** — use on light surfaces (use the gold version of the logo).

Choose based on background contrast.

## Typography

- **News Cycle** — used in the constitution and official documents.
- **Custom hand-drawn masthead lettering** for _Chicken Scratch_ masthead (don't substitute this).

## Aesthetic

> Literary, polished, and warm with a handcrafted feel.

Avoid overly corporate/sterile looks. The brand reads as warm, inviting, and artistic — not clinical.

## Brand Asset Storage

- **Nae's personal computer** (primary, complete)
- **Canva** (partial)

**Future state:** If a brand-asset upload feature lands in the chickenscratch.me admin menu, assets can be centralized there.

## 🚨 Active Action Item

Handles on **TikTok** and **Instagram** currently contain "ud" and **must be changed to remove it**. This is a compliance requirement — student orgs typically can't use "ud" in handles without approval. Owner: PR Chair; blocker: finalize the new handle name.
$md$,
  ARRAY['branding', 'design', 'reference'],
  false
)

ON CONFLICT (role_slug, slug) DO NOTHING;
