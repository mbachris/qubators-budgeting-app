# ADR-001 Stack: Expo
- Chosen: Expo React Native + TypeScript + EAS Build.
- Why: single codebase to APK, EAS preview APK without local Android SDK, OTA later.
- Rejected: Flutter (rewrite cost), native Kotlin (slow for solo AI-assisted).
# ADR-002 Dual storage
- Phone SQLite (expo-sqlite) truth offline. Server Postgres 16 Docker truth online.
- All tables: id uuid, user_id nullable, updated_at, is_deleted, rev. Outbox sync_queue on phone.
- R2 blobs only (backups/images), presigned from server. No ledger truth in R2.
# ADR-005 Auth (Better Auth, optional)
- Guest default full-function. Settings > Cloud Sync email OTP via Better Auth (Hono + Drizzle pg).
- Login backfills user_id, pushes queue. Logout keeps local. Secrets server-only.
# ADR-006 Money model: allocations are deductions, spending is monthly
- The deduction buckets are NOT spending categories. Every income is split immediately:
  tithe 10%, savings 15%, emergency 5%, community 5% — the remaining **65%** is the spendable pot.
- Each `income_entries` row stores its own snapshot (`tithe_minor … spendable_minor`) so later
  rule changes never rewrite history.
- Tithe, savings and emergency are **given by default** the moment income arrives (no user action);
  only community giving is tracked, under exactly two categories: `ceremonies` and `society`.
- Expenses belong to a month pot (`period = YYYY-MM`) and to a user-defined `expense_categories`
  row of kind `bill` (fixed monthly, amount remembered), `daily` (everyday), or `goal`
  (a planned purchase such as a car or a trip, with its own name and optional `target_minor`).
- A `goal` is spending, not a budget: it draws on the month's spendable pot like any other expense,
  but its running total accumulates across months so the plan can be measured against its target.
- Rejected: treating buckets as spending budgets (mixes two different ideas); one global spendable
  balance (loses the per-month story); asking the user to confirm tithes/savings every month (noise);
  filing a car or a trip under "everyday spending" (hides a multi-month plan inside a daily list).
- Dev note: model changes bumped phone `PRAGMA user_version` (v2 reset, later additive ALTERs run on
  every launch) and server `sql/002_model_v2.sql` drops the v1 domain tables.
# ADR-007 Income sources: attribution, not separate pots
- People earn from several places (salary, business, side hustle, gift). `income_sources` is a
  seeded, user-extendable list; `income_entries.source_id` tags each record (null reads as `Other`).
- Every source is split by the **same** rules — the essentials are set aside on every income
  whoever paid — and each row keeps its own amounts, so per-source tithe/savings totals come free
  from the snapshot columns.
- **One pot per month, not one pot per source.** Sources answer "where did it come from"; spending
  stays pooled. Per-source pots would force the user to tag every expense to a source.
- Income tab reads as a ledger: this month by source, the set-aside per bucket, the entries
  themselves, and all time by source.
- Rejected: per-source percentage overrides (deferred — one rule set first, revisit if users ask);
  reserving monthly bills at income time (deferred — it changes what the hero number means);
  separate wallets per source (bookkeeping burden with no budgeting gain).
# ADR-008 Correcting the record: soft deletes and replace-on-fix
- Anything the user typed by mistake must be removable, and removing must not silently rewrite the
  story. Every table already carries `is_deleted` and `rev`, so removal is a **soft delete**:
  `UPDATE … SET is_deleted=1` locally plus an outbox entry, identical to `deleteExpense`.
- Removing income is not hiding a line — it un-sets the essentials that came off that income, and it
  moves the month's *available for expenditure*. So removal asks for a **confirming tap that names the
  numbers** (income and gifts), unlike Spend's instant `✕`.
- **Fix = replace, not edit in place.** Each `income_entries` row stores its own split snapshot
  (`tithe_minor … spendable_minor`). Editing those numbers in place would make the history lie, so
  *Fix* loads the row back into the form and saving **writes the corrected entry first, then removes the
  old one** — a failure leaves the original intact, never a double count.
- Removing a gift returns its amount to the community bucket's *remaining to give* and reverses any
  project credit it had created.
- Rejected: in-place editing of income amounts (silently rewrites set-aside history); hard `DELETE`
  (breaks the outbox/LWW contract and cannot be reconciled by a later pull); undo-toast instead of
  confirm (too easy to miss when four figures move at once).
