# Hen & Ink Society — Public Relations Chair (PR Nightmare)

> **Purpose of this doc:** Reference guide for the PR Chair role, combining constitutional duties, brand standards, and the existing content playbook. For Cody (Claude Code) to use when helping with PR-related work.

---

## Role Overview

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
3. **Promote and distribute *Chicken Scratch*** — both digitally and in print
4. **Create and maintain all social media accounts and webpages** representing the organization
5. **Coordinate contact with media outlets** requesting communication from the organization
6. **Moderate the *word nerds!* Discord server**

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
- Must follow brand standards (see below)

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

- One of four officers moderating the *word nerds!* server
- Channel consolidation is in progress — Discord is being established as the **primary communication channel** for the club

---

## Content Playbook (Already Built)

A content playbook was built specifically for the PR Chair role to enable **autonomous, repeatable posting** — so the PR Chair doesn't need to reinvent the wheel every week.

### Core Rhythm

- **Monday / Wednesday / Friday** posting cadence
- **Monthly anchors** — recurring content types tied to the publication cycle

### Current Location

- **Nae's personal computer** (source)
- **Discord** (shared with officers)

### Future State (Proposed)

If Cody wires up a playbook upload feature in the **chickenscratch.me admin menu**, Nae can upload the playbook there for centralized officer access. **This is a candidate feature for the admin menu build.**

---

## Brand Standards — NON-NEGOTIABLE

All PR materials (digital and print) must follow these.

### Colors

| Color | Hex | Use |
|---|---|---|
| **Ink Gold** | `#FFD200` | Primary brand color; backgrounds, accents |
| **Hen Blue** | `#00539F` | Text, logo strokes, contrast elements |

These are official University of Delaware colors — alignment matters.

### Logo Variants

Two logo variants exist, both transparent-background PNGs:
1. **Gold background / blue linework** (on dark or colored surfaces — use blue version)
2. **Blue background / white linework** (on light surfaces — use gold version)

Choose based on background contrast.

### Typography

- **News Cycle** — used in the constitution and official documents
- **Custom hand-drawn masthead lettering** for *Chicken Scratch* masthead (don't substitute this)

### Brand Asset Storage

- **Nae's personal computer** (primary, complete)
- **Canva** (partial — kind of)

**Future State:** If Cody wires up asset upload in the **chickenscratch.me admin menu**, assets can be centralized there. **This is a candidate feature for the admin menu build.**

### Aesthetic

> Literary, polished, and warm with a handcrafted feel.

Avoid overly corporate/sterile looks. The brand reads as warm, inviting, and artistic — not clinical.

---

## Technical Infrastructure PR Chair Should Know About

The PR Chair works closely with the **chickenscratch.me** web platform:

- **Next.js** app with **Drizzle ORM**, **PostgreSQL**, **Clerk** auth, **Vercel** deployment
- **PDF flipbook** for zine issues (uses `pdfjs-dist` and `react-pageflip`, PDFs stored in **Vercel Blob**)
- **Discord webhook integration** planned — will auto-post Chicken Scratch events to Discord (prerequisite: `DISCORD_WEBHOOK_URL` in Vercel env vars)
- **Weekly digest cron job** (Vercel Cron) — part of officer notification infrastructure

The PR Chair doesn't need to be a developer — but should know these tools exist and what they do so they can request features or flag issues.

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
- Advertising space coordination (Treasurer rents ad space in *Chicken Scratch* — PR Chair helps design layout)

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

---

## Open Questions / Gaps to Fill

- [ ] New proposed handles for TikTok and Instagram (must drop "ud")
- [ ] Access credential handoff procedure when PR Chair role changes
- [ ] Does Vienna need admin access to chickenscratch.me for playbook + asset upload?

## Resolved (no longer open)

- ✅ Current PR Chair: Vienna
- ✅ Content Playbook location: Nae's computer + Discord (pending chickenscratch.me admin menu upload)
- ✅ Active social platforms: TikTok + Instagram
- ✅ Brand asset location: Nae's computer + Canva (pending chickenscratch.me admin menu upload)

## Candidate Features for chickenscratch.me Admin Menu

Based on current PR Chair infrastructure needs:

1. **Content Playbook upload + viewing** — give officers access to the playbook in one place
2. **Brand asset library** — centralized logos, color refs, fonts, templates
3. **Social media link hub** — current handles, posting schedule reference
