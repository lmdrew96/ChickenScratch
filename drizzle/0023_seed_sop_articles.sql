-- Seed initial SOPs per role (toolkit overhaul §10).
-- Idempotent via ON CONFLICT on (role_slug, slug). Officers can edit or
-- delete these freely; the seed only runs once.

INSERT INTO sop_articles (role_slug, slug, title, body_md, tags, is_draft)
VALUES
  (
    'treasurer',
    'chicken-scratch-printing-reimbursement',
    'Chicken Scratch printing reimbursement flow',
    $md$## Overview

Printing is done at the local public library, paid **out-of-pocket** by the
treasurer or another officer, and reimbursed via the Student Involvement
Office (SIO) **Request for Check (RFC)** form.

## Step-by-step

1. **Print the issue** at the public library and pay at the counter.
2. **Scan or photograph every receipt** the day you get them. Original paper
   receipts must also be retained — SIO may ask for them.
3. **File the RFC** via the [SIO Finance Portal](/admin#toolkit-links) with
   the receipt attached and the correct purpose code.
4. **Wait for approval.** SIO emails back a check number once the check is cut.
5. **Record the check number** on the matching pipeline entry in the
   treasurer toolkit. Only then advance to the **"Ledgered"** stage.
6. **Ledger entry:** create an expense entry matching the reimbursement.

## Deadlines

- **45-day RFC window** from receipt date. After 30d the reimbursement
  pipeline will flag the receipt yellow; after 40d it flags red; past 45d
  SIO will likely decline.

## Common gotchas

- Don't ledger until the check number is in your inbox. "Approved" is not
  "paid."
- If a receipt is in another language (rare but possible), include an
  English translation with the RFC.
$md$,
    ARRAY['finance', 'reimbursement', 'printing'],
    false
  ),
  (
    'treasurer',
    'out-of-pocket-vs-purpose-code',
    'Out-of-pocket vs. purpose-code flow',
    $md$## The two paths

UD RSOs have two ways to spend money:

1. **Purpose-code flow** — the expense is paid directly from the university
   account using a pre-approved purpose code. No reimbursement needed, but
   the purpose code must cover the spend.
2. **Out-of-pocket flow** — an officer pays personally, then submits an RFC
   for reimbursement.

## When to use which

- **Purpose code** is preferred when the vendor accepts it and the spend is
  covered by an existing code (e.g. Creative Services print jobs).
- **Out-of-pocket** is the default for the public library printing run, ad
  hoc supplies, and anything a vendor won't invoice the university for.

## Toolkit flag

When you log a new expense in the Ledger Entry form, check **"Out-of-pocket
(needs reimbursement)"** to have the toolkit prompt you to create a matching
reimbursement pipeline entry.
$md$,
    ARRAY['finance', 'policy'],
    false
  ),
  (
    'treasurer',
    '24-hour-cash-deposit-rule',
    '24-hour cash donation deposit rule',
    $md$## The rule

Any cash taken at a meeting (dues, donations, fundraiser proceeds) **must
be deposited to the university account within 24 hours**. Delayed deposits
are a compliance finding and can cost the org access to its funds.

## Workflow

1. At the meeting, record the cash donation in the Ledger Entry form with
   **payment method = Cash**.
2. Within 24 hours, deposit at SIO or a Blue Hen Pavilion drop-safe.
3. Return to the treasurer toolkit and click **"Mark deposited"** on the
   donation row under Compliance Alerts.

## Warnings

The Compliance Alerts widget will count down the 24-hour window and flip
red when the deposit is overdue. Don't dismiss the alert until the deposit
is actually made.
$md$,
    ARRAY['finance', 'cash', 'compliance'],
    false
  ),
  (
    'treasurer',
    'email-receipt-policy',
    'Email receipts vs. original-language policy',
    $md$> **Draft:** pending confirmation with Jessica / Suzanne in SIO. Do
> not rely on the specifics below until the status flag is cleared.

## Draft guidance

- SIO generally accepts emailed PDF receipts in place of paper originals,
  **except** for cash-paid transactions at small vendors.
- Receipts not in English may need an attached translation.

Cross-reference with Jessica or Suzanne before submitting an RFC that relies
on either exception.
$md$,
    ARRAY['finance', 'receipts', 'draft'],
    true
  ),
  (
    'treasurer',
    'allocation-board-increase',
    'How to request an allocation board fund increase',
    $md$## Why this exists

The default General Operating Budget (GOB) is **$400**. To qualify for a
larger budget (up to **$800**), the org must submit an allocation board
request demonstrating sustained activity.

## Steps

1. Prepare a summary of the current year's spend (ledger totals by category).
2. Prepare a forward-looking budget projection (known printing runs, event
   costs, etc.). Use the Upcoming Expenses list in the GOB tracker as a
   starting point.
3. File the allocation board form via the SIO Finance Portal.
4. When approved, update `site_config.gob_budget_dollars` in the admin panel
   to the new ceiling (e.g. `800`). The GOB tracker will pick up the change
   on the next page load.
$md$,
    ARRAY['finance', 'budget'],
    false
  ),
  (
    'secretary',
    'voting-rights-article-viii',
    'Voting rights revocation & restoration (Article VIII)',
    $md$## Rule

A member who misses **three meetings in a rolling calendar month** loses
voting rights until they attend three consecutive meetings.

## Workflow

- Take attendance at every meeting via the toolkit attendance widget.
- The "Voting rights at risk" flag in the This Week card will surface any
  member approaching the threshold.
- When voting rights are lost, note it in the meeting minutes.
- When three consecutive attendances restore rights, note that too.

## Related articles

- Article VIII covers absence policy in full.
- Article XVIII defines quorum — half of currently voting members for
  financial business.
$md$,
    ARRAY['membership', 'constitution'],
    false
  ),
  (
    'secretary',
    'minutes-format-discord-archival',
    'Minutes format & Discord archival process',
    $md$## Minutes format

Each meeting's minutes should capture:

- **Date & attendees** (present / absent / excused)
- **Agenda items** with vote outcomes
- **Action items** (owner, due date)
- **Next meeting** date

## Archival

1. Draft minutes in the Secretary working doc.
2. After the meeting, paste into the `#meeting-minutes` Discord channel.
3. Sync the canonical copy into the Google Drive archive (link in the
   Quick Links panel).
4. Close the loop by checking off the relevant recurring task in the
   toolkit.
$md$,
    ARRAY['minutes', 'archive', 'discord'],
    false
  ),
  (
    'secretary',
    'member-removal-article-xii',
    'Member removal formal procedure (Article XII)',
    $md$## When this applies

Article XII covers removal of members for conduct reasons. This is rare
and should be handled with care. Follow the constitution exactly — missteps
can be appealed.

## Procedure (summary)

1. **Notice** to the member of the allegation.
2. **Hearing** at an officer meeting where the member may respond.
3. **Vote** requiring the thresholds in Article XII.
4. **Notice of outcome** documented in the minutes.

Refer to the constitution document for the exact vote threshold and timing
requirements. When in doubt, loop in the faculty advisor.
$md$,
    ARRAY['membership', 'constitution'],
    false
  ),
  (
    'pr-chair',
    'brand-assets',
    'Brand assets (logos, colors, masthead)',
    $md$## Where things live

- **Canva** — primary design tool. Team access in the Quick Links panel.
- **Google Drive `/Hen & Ink/Brand`** — master logo files, masthead PDFs,
  fonts.
- **Linktree** — public landing surface; update when new issues drop.

## Color palette

Hen & Ink brand colors:

- **Ink Gold** — `#FFD200`
- **Hen Blue** — `#00539F`

Use both sparingly — they're accent colors, not backgrounds.

## Typography

Serif body, sans-serif headings. Specifics in Canva brand kit.
$md$,
    ARRAY['branding', 'design'],
    false
  ),
  (
    'pr-chair',
    'content-rhythm',
    'Mon/Wed/Fri content rhythm and monthly anchors',
    $md$## Weekly cadence

- **Monday** — week preview / prompt announcement
- **Wednesday** — mid-week feature (member spotlight, submission deadline
  reminder, event promo)
- **Friday** — recap / share the week's published pieces

## Monthly anchors

- **First week of month** — issue release post
- **Second week** — "Meet the Flock" member announcement
- **Third week** — prompt or craft feature
- **Fourth week** — next-issue submissions call

The PR content calendar widget tracks all of this with Empty / Drafted /
Scheduled / Posted states.
$md$,
    ARRAY['content', 'social'],
    false
  ),
  (
    'pr-chair',
    'issue-distribution-checklist',
    'Chicken Scratch issue distribution checklist',
    $md$## On release day

- [ ] Push the Linktree update with the new issue link
- [ ] Post the release announcement to Instagram + Discord
- [ ] Email the list-serv
- [ ] Drop printed copies at each campus location (Morris, Perkins, Memorial)
- [ ] Share in the #publications Discord channel
- [ ] Thank contributors individually in DMs

## Stretch (nice-to-have)

- [ ] Short reel/teaser featuring 1-2 pieces
- [ ] "Meet this issue" post featuring the cover + TOC
$md$,
    ARRAY['distribution', 'release'],
    false
  ),
  (
    'president',
    'rso-reregistration-checklist',
    'RSO re-registration checklist',
    $md$## Timing

Annual re-registration happens in late spring. Miss the deadline and the
org loses active status for the next academic year.

## Required items

- Updated officer roster (names, titles, UD emails)
- Faculty advisor confirmation
- Refreshed constitution PDF (if changes were made)
- Meeting schedule / program plan for the next year

## Filing

All filed via the [RSO Registration Portal](/admin#toolkit-links). Hand off
admin access to the next president at election time so they can start
early.
$md$,
    ARRAY['compliance', 'registration'],
    false
  ),
  (
    'president',
    'faculty-advisor-cadence',
    'Faculty advisor cadence and topics',
    $md$## Cadence

- **Monthly** — scheduled check-in with the advisor. Show up prepared.
- **As-needed** — any disciplinary issue, constitutional question, or
  financial escalation should go to the advisor before it blows up.

## Topics to cover monthly

- Current membership and any at-risk situations
- Upcoming events and university coordination needs
- Financial health (big-picture, not line items)
- Any conflicts or concerns flagged in officer meetings

## Handoff

At the end of the term, **introduce** the next president to the advisor in
person (or on Zoom). Don't just forward an email.
$md$,
    ARRAY['advisor', 'governance'],
    false
  ),
  (
    'president',
    'election-process-article-xi',
    'Election process (Article XI)',
    $md$## When

First week of April, per Article XI.

## How

Elections run via Google Forms (handled outside the toolkit).

## Process (summary)

1. **Open nominations** two weeks before the vote. Self-nominations allowed.
2. **Post the slate** in Discord and the list-serv.
3. **Run the vote** via Google Forms, one response per voting member.
4. **Announce results** at the election meeting and post in Discord.

## Afterwards

- Schedule transition meetings between outgoing and incoming officers.
- Update roles in the admin panel.
- Transfer ownership of Discord, RSO portal, and any shared docs.
$md$,
    ARRAY['elections', 'constitution'],
    false
  ),
  (
    'president',
    'officer-removal-article-xii',
    'Officer removal procedure (Article XII)',
    $md$## When this applies

Officer removal is rare and governed by Article XII. Use this path for
conduct that materially harms the org — not for "we disagree with this
decision."

## Procedure (summary)

1. Written notice of the concern to the officer in question.
2. Hearing at an officer meeting; the officer may respond.
3. Vote requiring the thresholds in Article XII.
4. If removed, document in the minutes and update admin roles.

Loop in the faculty advisor early. If the situation is ambiguous, default
to mediation over removal.
$md$,
    ARRAY['governance', 'constitution'],
    false
  )
ON CONFLICT (role_slug, slug) DO NOTHING;
