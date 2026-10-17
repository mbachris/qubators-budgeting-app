# Changelog

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
