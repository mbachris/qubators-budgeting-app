# Changelog

## Unreleased — 1.0.0: your own percentages, a first-run intro, an identity, a dark theme

- **Deduction percentages are yours to set.** *Settings → Deduction percentages* takes the four values
  (tithes, savings, emergency, community) as whole numbers; *Spendable (Living)* is the remainder and is
  never typed. The four may total at most 100% — above that the save is refused with a message rather
  than quietly producing a negative pot. **Only new income is affected**: every existing entry keeps the
  split it was given, so changing a percentage never rewrites the past. *Reset to 10 / 15 / 5 / 5*
  restores the defaults. Every label that used to say "10%", "15%", "5%" and "65%" now reads the live
  rules instead — Home's all-time card, the income ledger, the community bucket and the empty-state copy
  cannot contradict a customised split.
- **A first-run intro, three screens, shown once.** *Income is divided the moment it arrives* (the four
  deductions with real amounts on a sample 100,000), *Only what is left is yours to spend* (the pot, and
  that months keep their own statement), *The essentials are already handled* (community giving is the
  one action; everything works offline with no account). Skippable, and replayable from
  *Settings → Show the intro again*. The tip card is suppressed while it is open.
- **An app identity.** A generated icon — a ring with one slice lifted out of it, i.e. part of every
  income set aside — plus an Android adaptive icon (mark inside the 66% safe zone, green background) and
  a splash mark on the same green. `tools/make-icons.cjs` draws them from the app's own palette, so the
  mark can be regenerated rather than redrawn by hand.
- **A dark theme.** *Settings → Appearance* switches the whole app between the light and dark palettes
  and remembers the choice on the device; the status bar follows. Screens now build their styles from
  the active palette instead of a static sheet created at import time, which is what made a runtime
  toggle possible. Accents (plan dots, tip chips, the community bucket) come from the active palette, so
  no screen shows a light-mode chip in the dark.
- App version **1.0.0**, `versionCode` 3; `expo-splash-screen` added for the splash config.

## Unreleased — remove & fix an income entry, remove a gift

- **Income entries can be removed.** Each row in *Entries in <month>* has a `✕`; removing asks for a
  confirming tap that names exactly what it un-sets (`300,000` salary → `−30,000` tithes, `−45,000`
  savings, `−15,000` emergency, `−15,000` community, `−195,000` available for expenditure).
- **Income entries can be fixed.** Tap a row (or *Fix*) and its amount, source, note and month load back
  into the form; saving then **replaces** the entry — the corrected record is written first, the old one
  removed after, so nothing is ever counted twice. Every row keeps its own split snapshot, so a
  correction re-runs the split instead of silently rewriting history.
- **Community gifts can be removed.** Each row in *Recent gifts* has a `✕` with a confirming tap; the
  amount returns to *remaining to give* so it can be recorded again correctly.
- Deletes are soft (`is_deleted = 1`) and queued like expenses, so offline maths and the next sync agree.
  No migration: every table already carried `is_deleted` + `rev`.
- Fixing an entry scrolls the form back into view.
- **A planned purchase's target is no longer write-once.** Each plan card shows its target with
  *Change target*, and a `✕` that removes it after a confirming tap that names the consequence
  (*"the 2,000,000 already in this plan stays"*). A plan created without a target — or with the wrong
  one — can now be corrected; the target is the plan, the running total is untouched.
- **A whole plan can be removed** (*Remove this plan* at the foot of each card, confirming tap first) —
  for a duplicate plan or one created by mistake. Removing it keeps every payment already logged to it:
  that money really was spent, so it stays in the month's records and in *Spending by category* with its
  name intact. Only the plan leaves the list.

## Unreleased — income sources (salary, business, side hustle, gift)

- New `income_sources` list, seeded with **Salary · Business · Side hustle · Gift / Support · Other**
  and extendable in-app (*＋ New source*). Every income record is tagged with where it came from.
- **Every source is split by the same rules** — tithes 10%, savings 15%, emergency 5%, community 5% —
  so the essentials are set aside on each income whoever paid. Each record keeps its own amounts.
- **Income tab is now a ledger**: source chips + amount + note + live split preview, then
  *Where <month> came from* (per-source totals, total in, each bucket set aside, spendable),
  *Entries in <month>*, and *All time by source* with the tithes each source produced.
- **Home** gains a *Where it came from* card above the deductions, so the hero number is explained.
- Phone schema **v6** adds `income_sources` and `income_entries.source_id` (seeded and added on
  launch, no reset); server `002` and the sync whitelist carry both.

## Unreleased — planned purchases (car, trip, big buys)

- New category kind **`goal`** = *Planned purchase*: a car, a trip, a big repair. It is its own item
  with its own name, an optional **target amount**, and a **running total across months** — separate
  from everyday spending and from monthly bills.
- **Spend → Planned purchases**: each plan shows spent vs target, a progress bar, what is still to go
  and what was added this month; the amount box is pre-filled with the remaining-to-target for one-tap
  logging.
- **Home → Planned purchases card** shows every plan's progress, with *Add to a plan* jumping to Spend.
- New category form gained a third choice (**Planned purchase**) plus an optional target field.
- Expense rows now label their kind: *Bill*, *Everyday* or *Planned*.
- Phone schema **v5** adds `expense_categories.target_minor` (added on launch for existing databases,
  no reset); server `002` and the sync whitelist carry it too.

## Unreleased — crash fix, named expenses, nicer tips

- **Fixed the native crash** `NativeDatabase.prepareAsync … NullPointerException`: expo-sqlite rejects
  `undefined` bind parameters, so every statement now normalises parameters to `null`
  (`bind()`/`run()` in `repo.js` and `client.js`).
- **Migration hardened**: v2/v3 data is upgraded additively; if any step fails the tables are rebuilt
  instead of leaving an unusable database. Failed writes now show a red banner in the app
  (tap to dismiss) instead of an unhandled promise rejection.
- **Expenses carry their own name**: on Spend, "What was it for?" sits with the amount, and picking
  *Other* asks you to name it. The note appears in Home's recent list and in Spend's logged list.
- **Emergency fund 5%** is part of the immediate deductions
 
## Unreleased — emergency fund, auto-given buckets, nicer tips

- **Emergency fund 5%** added to the immediate deductions. Split is now
  **Tithes 10% · Savings 15% · Emergency 5% · Community 5% · Spendable 65%**, and every bucket shows its
  percentage in the UI.
- **Tithe, savings and emergency are "given" automatically** when income arrives (no Record button);
  only community giving is an action. Removed the payout buttons for those buckets.
- **Home hero card** now shows *Available for expenditure* for the month with a grid of Income / Deducted /
  Spent / Spendable, plus "spent of spendable" percentage.
- **All time card sits at the bottom of Home**: total income, total spent, available, then each bucket
  (tithes, savings, emergency, community given/remaining, ceremonies vs society).
- **Community tab is exactly two categories**: Ceremonies and Society. Project gifting removed from the UI.
- **Tip popup redesigned**: themed accent bar, category chip, large quote mark, animated entry,
  *Another one* / *Got it*. Still 18 sayings, now every 3 minutes.
- Phone schema v4 adds `income_entries.emergency_minor` (kept data, no reset). Server `002` adds the column + rule.

## Unreleased — money model v2 (deductions + monthly pots)
Rework based on feedback: the four buckets are **not** spending categories.

- Allocation = **deduction off each income**, applied immediately: tithe 10%, savings 15%, community 5%;
  the **70% remainder is the spendable pot**. Every `income_entries` row stores its own snapshot.
- **Monthly pots**: income and spending both carry a `period` (`YYYY-MM`). Home has a month navigator
  (‹ September ›) so past months keep their own statement.
- **Spending categories are user-defined**: `kind = 'bill'` (fixed monthly, amount remembered after the
  first payment → one-tap later) or `'daily'` (everyday). Add as many as you like from the Spend tab.
- **Home** = month statement (income → deductions → spendable → spent → left), bills status, spending by
  category, recent expenses, plus an "All time" card (savings held, tithes given, community given).
- **Payouts** record money actually moved out of a bucket (tithe given, savings moved, community given,
  optionally to a project) so "tithes given" and "community impact" are real numbers, not guesses.
- **Community giving has two categories**: Ceremonies and Society (verified projects stay optional and
  count into Society).
- **Savings works like tithes**: set aside → given → still to give (no more "held" arithmetic).
- **Available for expenditure** is now the hero card on Home: this month's income minus the three
  deductions minus what you already spent, with the all-time version right below it.
- **18 sticky sayings** about budgeting, spending, saving, wealth, giving and peace of mind (`src/content/tips.js`)
  shown when the app opens and every 7 minutes.
- Server `/sync/projects` now folds community payouts into `raised_minor`.
- Sync tables are now `allocation_rules | income_entries | expense_categories | expenses | payouts`.
- Server URL is editable in-app (Settings → Server URL) so a changing LAN IP needs no rebuild.
- Reset: phone `PRAGMA user_version = 2` recreates local tables; server `sql/002_model_v2.sql` drops the
  v1 domain tables. Only test data is lost.

## v0.1.0 — First APK (working offline budgeting + optional cloud sync)
Built with EAS (`preview` → APK), package `com.qubators.budgeting`.

Included:
- Offline budgeting: SQLite on device, persists across restarts, works in airplane mode.
- Allocation engine: 10% Tithes / 15% Savings / 5% Community / 70% Living (remainder), minor units + largest-remainder rounding, 5 unit tests green.
- Screens: Dashboard (totals + per-category bars), Add Income (live split preview), Community (local Give), Settings (storage + export).
- Local Vault always on; storage badge (`On this device` / `Cloud Sync • Pending N` / `Synced`).
- Sync-ready schema everywhere: `id, user_id, updated_at, is_deleted, rev` + phone outbox `sync_queue`.
- Cloud Sync (optional, same-WiFi): Hono API + Better Auth email-OTP + bearer tokens + Drizzle/Postgres 16 (Docker on local device).
- `/sync/push` (last-write-wins, conflict rows returned), `/sync/pull`, `/sync/projects`.
- `/uploads/presign` for Cloudflare R2 (returns 501 until `R2_*` env set).
- Docs: concept, implementation plan, design system + HTML preview, ADRs, sync contract, API.

Verified: 3 income rows synced into Postgres with the signed-in `user_id`.

## v0.0.0 — Foundation
- Phase 0 scaffold: workspaces, Compose Postgres, README, hygiene files.
- Domain engine + tests, design system, ADRs + sync contract.
- App shell verified in Expo Go (SDK 57); phone SQLite persistence.
- Server reworked to plain JS (no esbuild/tsx) + hand-written SQL migration.
