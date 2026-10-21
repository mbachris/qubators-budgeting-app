# BudgetSafe — Product Requirements Document

**Version:** 1.0 · **App:** 1.0.0 (`versionCode` 6) · **Date:** 21 October 2026
**Status:** Shipped to internal testers as a sideloaded Android APK
**Working name / repo:** Qubators Budgeting App · `github.com/mbachris/qubators-budgeting-app`

---

## 1. Summary

BudgetSafe is an offline-first Android budgeting app whose central claim is that **you never budget
your whole income**. Every income is divided the moment it is recorded: four deductions come off first
(tithes, savings, an emergency fund, community giving), and only the remainder becomes the pot you spend
from that month. The app tracks the personal budget and the giving that runs alongside it, without
turning giving into a spending category.

The phone is the source of truth. There is no account, no login, and no server requirement. A backup is
a file the user owns and can mail to themselves.

## 2. Problem

Conventional budgeting apps treat every outgoing as a category of spending. For the people this app is
built for, that is the wrong shape:

- **The essentials are not optional and not spending.** Tithes, savings and an emergency fund come off
  an income before it can be budgeted, and treating them as categories invites "borrowing" from them.
- **Community giving is an obligation with two faces** — ceremonies (weddings, funerals, family events)
  and society (neighbours, church, local causes) — and it needs a running balance, not a monthly total.
- **Income is irregular and comes from several places** (salary, business, side hustle, gifts), but each
  income is split the same way.
- **Plans are not budgets.** A car or a trip takes months; the app must show progress against a target
  without pretending that money is still available.
- **Software that requires internet or an account is software that can be taken away.** Records should
  survive the app, the phone, and the server.

## 3. Users and jobs

**Primary — the household budgeter.** One person, one phone, salaried with side income, obligations to
family and community. Wants to know *"how much can I actually spend this month?"* and *"how much am I
still expected to give?"* without maintaining a spreadsheet.

Jobs to be done:

1. Record an income in under 15 seconds and see what it leaves to spend.
2. Pay this month's bills and log everyday spending quickly, by name.
3. Track a car or a trip across months against a target.
4. Know the community balance and record a gift in one action.
5. Fix a mistake without the app quietly rewriting history.
6. Keep a copy of everything somewhere that is not this phone.

**Secondary — the person who was given the APK.** Needs the model explained once, in plain language,
and never sees developer vocabulary.

## 4. Product principles

| # | Principle | Consequence in the product |
|---|---|---|
| P1 | **The phone is the truth.** | Every screen works with no internet and no account; writes are local first. |
| P2 | **Deductions are not spending.** | Four buckets come off income immediately; they never appear in spending totals or category charts. |
| P3 | **Only the remainder is spendable.** | The hero number is the leftover of the split, minus what has been spent from the monthly pot. |
| P4 | **Every entry keeps its own split.** | Percentages can change, but a past entry is never recalculated. |
| P5 | **Nothing typed by mistake is permanent.** | Every recorded thing can be removed, with a confirming tap where figures move. |
| P6 | **The record is never silently rewritten.** | A correction is a replacement: write the corrected entry, then remove the old one. |
| P7 | **Ownership is visible.** | Storage is stated in plain words in Settings; a backup is a file the user keeps. |
| P8 | **No developer vocabulary on screen.** | No database names, no IP addresses, no row counts, no sync jargon in primary copy. |

## 5. The money model

**One income, one split, one snapshot.**

```
income (minor units, BIF)
  ├─ Tithes / Giving        10%   → recorded as given automatically
  ├─ Savings & Wealth       15%   → recorded as set aside automatically
  ├─ Emergency fund          5%   → recorded as set aside automatically
  ├─ Community Impact        5%   → waits for an action (ceremonies / society)
  └─ Spendable (Living)     65%   → this month's pot
```

Rules:

- **M-M1** Percentages are whole numbers, editable in Settings. The four deductions may total at most
  100%; **Spendable is never typed** — it is always `100 − the deductions`.
- **M-M2** Defaults are 10 / 15 / 5 / 5 → 65% spendable. *Reset to 10 / 15 / 5 / 5* restores them.
- **M-M3** Every income row stores its own amounts (`tithe_minor`, `savings_minor`, `emergency_minor`,
  `community_minor`, `spendable_minor`). A percentage change affects **new income only**.
- **M-M4** Money is held in integer minor units; splitting uses largest-remainder rounding, so the five
  parts always sum exactly to the income — verified for amounts from 1 to 123,456.
- **M-M5** The month is a pot (`period = YYYY-MM`). Income and expenses belong to a period; the Home
  screen navigates months and a past month keeps its own statement.
- **M-M6** Tithes, savings and emergency are "given by default": no button, no reminder, recorded as set
  aside at income time. Community giving is the only bucket with an action.
- **M-M7** Bucket **names** are fixed in 1.0; **percentages** are not.
- **M-M8** Community balance = everything deducted into the bucket, ever, minus everything recorded as
  given. It carries across months and does not expire.

## 6. Functional requirements

Status: **S** shipped in 1.0 · **D** deferred · **X** explicitly out of scope for 1.0.

### 6.1 Income

| ID | Requirement | Status |
|---|---|---|
| IN-1 | Record an income with amount, source, optional note, and the month it belongs to (defaults to this month). | S |
| IN-2 | Show a live split preview of the amount before saving, with each bucket and its percentage. | S |
| IN-3 | List the month's entries; tap a row to see its own split snapshot. | S |
| IN-4 | Show *Where &lt;month&gt; came from*: per-source totals, total in, each bucket set aside, spendable. | S |
| IN-5 | Show *All time by source*, including the tithes each source produced. | S |
| IN-6 | Multi-currency. | X (BIF only; `currency` column exists) |

### 6.2 Income sources

| ID | Requirement | Status |
|---|---|---|
| SR-1 | Seed **Salary · Business · Side hustle · Gift / Support · Other**; allow *＋ New source* inline. | S |
| SR-2 | Every source is split by the same rules; a source is attribution, never a separate pot. | S |
| SR-3 | Per-source percentage overrides. | D (ADR-007) |
| SR-4 | Rename or delete a source after creation. | D |

### 6.3 Spending

Three kinds of category, any number of each:

| ID | Requirement | Status |
|---|---|---|
| SP-1 | **Bills** — fixed monthly, due day, amount remembered after the first payment and pre-filled next month. | S |
| SP-2 | **Everyday** — log an amount with a required name (*What was it for?*). | S |
| SP-3 | **Planned purchases** — a named plan (car, trip) with an optional target; a running total across months; progress bar; remaining pre-filled. | S |
| SP-4 | Change or clear a plan's target after creation (target is editable, spending is not). | S |
| SP-5 | Remove a whole plan; payments already logged to it stay in the record and in category totals. | S |
| SP-6 | Remove a single logged expense (any kind). | S |
| SP-7 | Edit a logged expense in place — deliberately not offered; remove and re-add. | X (ADR-008) |
| SP-8 | Delete or rename a `bill` / `daily` category (only plans can be removed today). | D |
| SP-9 | Move payments from a removed plan to another plan. | D |
| SP-10 | Reserve unpaid bills out of the spendable pot at income time ("free to spend"). | D (ADR-007) |

### 6.4 Community giving

| ID | Requirement | Status |
|---|---|---|
| CO-1 | Exactly two categories: **Ceremonies** and **Society**. No free-form categories. | S |
| CO-2 | Show the bucket percentage, this month's deduction, all-time given and **remaining to give**. | S |
| CO-3 | Record a gift with one action; *Use all remaining* fills the amount. | S |
| CO-4 | List recent gifts; remove one with a confirming tap, returning the amount to *remaining*. | S |
| CO-5 | Credit a gift to a community project. | X in 1.0 (schema carries `project_id`; seeded project list is not surfaced) |

### 6.5 Home

| ID | Requirement | Status |
|---|---|---|
| HO-1 | Month navigator (‹ Month ›) with *This month* / *Past month*. | S |
| HO-2 | Hero card: **available for expenditure** = spendable − spent, with spent, spendable and a usage bar that turns red when overspent. | S |
| HO-3 | *Where it came from* — the month's income by source. | S |
| HO-4 | *Deductions this month* — each bucket with its percentage and amount. | S |
| HO-5 | *Bills this month*, *Planned purchases* (progress), *Spending by category*, *Recent expenses*. | S |
| HO-6 | **All time** card at the bottom: total income, total spent, available for expenditure, each bucket given, community remaining, ceremonies vs society. | S |
| HO-7 | Storage/sync status pill above the month. | Removed in 1.0 (`versionCode` 6); storage is stated in Settings |

### 6.6 Correction

| ID | Requirement | Status |
|---|---|---|
| CR-1 | Removing an income or a gift requires a confirming tap that names the figures it un-sets. | S |
| CR-2 | *Fix* an income: refill the form, then **add the corrected entry and remove the old one** — never edit the snapshot in place. | S |
| CR-3 | All removals are soft deletes (`is_deleted = 1`) plus an outbox entry, so sync and totals agree. | S |
| CR-4 | Undo a removal from a toast. | X (confirming tap instead) |

### 6.7 Backup and restore

| ID | Requirement | Status |
|---|---|---|
| BK-1 | *Back up now* writes one JSON file and opens Android's share sheet (Gmail, Drive, WhatsApp, Files). | S |
| BK-2 | The file contains every table, **including soft-deleted rows**; it records `app`, `format`, `schemaVersion`, `exportedAt`, `counts`. | S |
| BK-3 | Settings shows when the last backup was made. | S |
| BK-4 | *Restore from a backup* validates the file, shows entry count and date, and requires a confirming tap: it **replaces** this phone's records. | S |
| BK-5 | Restore matches rows to the live schema by column name, so an older file still restores. | S |
| BK-6 | Restored rows are queued for Cloud Sync at restore time, so the phone's state wins over an older server copy. | S |
| BK-7 | A backup that survives losing the server **and** the phone without manual action. | D (see §11) |
| BK-8 | Encrypted backup file. | D (file is plain JSON; stated in the UI) |

### 6.8 Cloud Sync (optional)

| ID | Requirement | Status |
|---|---|---|
| SY-1 | Off by default; the app is fully usable signed out. | S |
| SY-2 | Email OTP sign-in against the user's own server; session token in SecureStore. | S |
| SY-3 | Push local changes and pull remote ones, last-write-wins on `updated_at`; soft deletes propagate. | S |
| SY-4 | The server address is editable in-app and hidden behind *Connection details*. | S |
| SY-5 | The UI states that Cloud Sync keeps devices in step and is **not** a backup. | S |
| SY-6 | Multi-device conflict resolution UI. | X (LWW only) |
| SY-7 | Hosted service, account recovery, password reset. | X (self-hosted on the user's PC) |

### 6.9 Preferences and guidance

| ID | Requirement | Status |
|---|---|---|
| PR-1 | Light/dark theme, applied instantly, remembered on device; the status bar follows. | S |
| PR-2 | Editable deduction percentages (whole numbers, sum ≤ 100, spendable derived). | S |
| PR-3 | Three-screen first-run intro explaining the split, the pot and the community action; skippable; replayable from Settings. | S |
| PR-4 | A themed saying every 3 minutes from a set of 18, never the same twice in a row; suppressed while the intro is open. | S |
| PR-5 | Onboarding that asks Local-only vs Cloud Sync. | X (the intro explains both; nothing is forced) |

## 7. Data model (phone, SQLite)

Schema **v6**, migrations are additive and run on every launch; a failed migration must never wipe data.

| Table | Purpose | Notable columns |
|---|---|---|
| `allocation_rules` | The four deductions + the `living` remainder | `id, name, percent, kind, sort` |
| `income_sources` | Where money came from | `id, name, sort` |
| `income_entries` | One income, with its **split snapshot** | `amount_minor, occurred_at, period, source_id, tithe_minor, savings_minor, emergency_minor, community_minor, spendable_minor` |
| `expense_categories` | Bills, everyday, plans | `kind ('bill'|'daily'|'goal'), default_amount_minor, target_minor, due_day, sort` |
| `expenses` | Spending against a category in a month | `category_id, period, amount_minor, note, occurred_at` |
| `payouts` | Community giving | `bucket, category ('ceremonies'|'society'), project_id, amount_minor, period` |
| `projects_cache` | Community projects pulled from the server | `goal_minor, raised_minor, cover_url` |
| `sync_queue` | Outbox | `table_name, row_id, op, payload, created_at` |

Every synced table carries `user_id, updated_at, is_deleted, rev`. Removing a plan does not remove its
expenses; expense queries deliberately do not filter on the category's `is_deleted`, so a removed plan
keeps its name in the record.

## 8. Experience specification

**Shell.** Five tabs, fixed order: **Home · Spend · Income · Community · Settings**. One scroll view per
tab. Errors appear as a dismissible red banner naming the action that failed, never a crash or a silent
no-op.

**Visual language.** Indigo-free green primary (`#16A34A` light / `#22C55E` dark), amber accent, bucket
accents (tithe violet, savings blue, emergency sky, community amber, living green). Cards on a tinted
background, 12–16 px radii, tabular figures for all money, 44 px minimum touch targets. Both palettes are
first-class; nothing may be hardcoded to a light-mode value.

**Identity.** Icon: a ring with one slice lifted out of it (part of every income set aside), generated by
`tools/make-icons.cjs`; Android adaptive icon on green; splash mark on green.

**Plain language.** No screen may say SQLite, Postgres, payload, sync queue, IP address, or "pending
uploads". Settings states *Saved on this phone*, *Backup*, *Cloud Sync* (with *Connection details* folded
away).

**Empty states.** Every empty list says what it is for and what to do next ("No bill categories yet. Add
one below.").

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Offline | 100% of features except Cloud Sync work in airplane mode. |
| Startup | Cold start to a usable Home under 2 s on a mid-range Android device (target, not yet measured formally). |
| Data integrity | Splits always sum to the income; restore is transactional; a failed write surfaces as a banner, never a partial record. |
| Privacy | Data stays on the device unless the user turns on Cloud Sync or shares a backup. The backup file is unencrypted plain JSON, and the UI says so. |
| Platform | Android 7+ (minSdk 24), portrait, phone-first; no iOS or web client in 1.0. |
| Accessibility | System font scaling respected, 44 px targets, tabular numerals, contrast checked in both themes. |
| Distribution | Sideloaded APK from EAS (`preview` profile, internal distribution). Play Protect must be bypassed per install. |

## 10. Out of scope for 1.0

Membership accounts and email registration in the app; premium tiers and analytics; sponsorship or
partnerships portal; verified community totals; multi-device conflict UI; iOS; web; real-time sync;
multi-currency; category renaming; recurring transactions; charts beyond usage bars.

The original concept document also proposed **email registration as a membership**, a **premium tier**,
and **community project funding**. In 1.0 the first two do not exist at all, and projects exist only as a
seeded `projects_cache` that the Community screen does not yet surface. That is a deliberate narrowing:
the app is a personal budget with a giving ledger, not a platform — see §11.

## 11. Release criteria for 1.0

- [x] The four deductions are configurable and the spendable share is always derived.
- [x] A percentage change never alters an existing entry.
- [x] Every recorded thing can be removed; income and gifts ask first.
- [x] Fix = replace, never edit in place.
- [x] Bills, everyday spending and planned purchases behave as specified, including plan removal.
- [x] Backup and restore round-trip on device without losing a row.
- [x] Dark theme is complete across all five tabs, the tip card and the intro.
- [x] Icon, adaptive icon and splash are the product's own.
- [x] Domain tests green (7/7); every mobile file parses; a full Android bundle builds.
- [ ] Restore verified against a backup made by a *different* build (schema drift).
- [ ] Cold-start and long-list performance measured on the target device.

## 12. Success measures

1. **No silent data loss.** Every figure on screen traces to a row; a split always equals its income.
2. **A first-time user can explain it.** After the intro, the tester can say what the hero number means
   and why tithes are not "spending". This is the single clearest signal the model landed.
3. **A backup exists outside the phone.** At least one backup file in the user's own mail or Drive,
   restorable.
4. **Corrections are used, not avoided.** The tester fixes a wrong income rather than leaving it.

## 13. Open questions

1. **Package identity.** The product is BudgetSafe; the Android package is still `com.qubators.budgeting`
   so existing installs keep their data. When does the package move, and is a migration path required?
2. **Distribution.** Stay sideloaded (Play Protect friction on every update) or move to a Play internal
   track (privacy policy, release signing, review)?
3. **Backup without ritual.** The current backup is excellent and entirely manual. Reminder after N days,
   or an automatic copy to a folder the user picks?
4. **Encryption.** The backup is readable JSON. Is a passphrase-encrypted file worth the recovery risk?
5. **Restore semantics.** Replacement is honest but blunt. Is a "merge" ever required, and on what
   evidence?
6. **Community projects.** The schema has `project_id` and the server seeds projects. Do we surface them
   in 1.0.x, or remove the pretence until there is a real project list?

## 14. Roadmap after 1.0

1. **Data safety (highest value):** backup reminder or scheduled copy; encrypted option; verify restore
   across builds.
2. **Record parity:** delete/edit for bills and everyday categories; move payments between plans; edit a
   logged expense via replace-on-fix.
3. **Money model options:** reserve unpaid bills out of the pot; per-source percentages (ADR-007).
4. **Distribution:** Play internal track, release signing, privacy policy, in-app version info.
5. **Community (only if real):** surface projects, credit gifts to them, verify totals.

---

## Appendix — glossary

| Term | Meaning |
|---|---|
| **Deduction** | A share taken off an income before it can be spent (tithe, savings, emergency, community). |
| **Pot** | The spendable share of a month's income, against which expenses are counted. |
| **Spendable** | The remainder after deductions — an output, never an input. |
| **Plan** | A planned purchase (`kind = 'goal'`) with an optional target and a running total across months. |
| **Giving bucket** | The community deduction, spent only through *Ceremonies* or *Society*. |
| **Snapshot** | The five amounts stored on each income row, fixed at the moment it was recorded. |
| **Tombstone** | A soft-deleted row (`is_deleted = 1`) kept so removals can be reconciled. |

Related documents: `Docs/project_concept.md` (original vision), `Docs/implementation-plan.md` (phases),
`Docs/architecture/ADRs.md` (ADR-001 … ADR-011), `Docs/design-system.md`, `CHANGELOG.md`.
