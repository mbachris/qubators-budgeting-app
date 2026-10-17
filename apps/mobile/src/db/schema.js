// Phone DDL — raw SQL, no ORM, sync-ready columns on every table.
// v2 model: allocations are DEDUCTIONS off each income; spending is against
// user-defined expense categories inside a monthly pot.

export const SCHEMA_VERSION = 4;

export const DDL = `
CREATE TABLE IF NOT EXISTS allocation_rules (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, percent REAL NOT NULL,
  kind TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS income_entries (
  id TEXT PRIMARY KEY, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'BIF',
  note TEXT, occurred_at INTEGER NOT NULL, period TEXT NOT NULL,
  tithe_minor INTEGER NOT NULL DEFAULT 0, savings_minor INTEGER NOT NULL DEFAULT 0,
  emergency_minor INTEGER NOT NULL DEFAULT 0, community_minor INTEGER NOT NULL DEFAULT 0,
  spendable_minor INTEGER NOT NULL DEFAULT 0,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'daily',
  default_amount_minor INTEGER NOT NULL DEFAULT 0, due_day INTEGER,
  sort INTEGER NOT NULL DEFAULT 0,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY, category_id TEXT NOT NULL, period TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, note TEXT, occurred_at INTEGER NOT NULL,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY, bucket TEXT NOT NULL, category TEXT, project_id TEXT,
  amount_minor INTEGER NOT NULL, note TEXT, occurred_at INTEGER NOT NULL, period TEXT NOT NULL,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS projects_cache (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, goal_minor INTEGER NOT NULL,
  raised_minor INTEGER NOT NULL DEFAULT 0, cover_url TEXT, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY, table_name TEXT NOT NULL, row_id TEXT NOT NULL, op TEXT NOT NULL,
  payload TEXT, created_at INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_queue_created ON sync_queue (created_at);
CREATE INDEX IF NOT EXISTS idx_income_period ON income_entries (period);
CREATE INDEX IF NOT EXISTS idx_expense_period ON expenses (period);
CREATE INDEX IF NOT EXISTS idx_payout_period ON payouts (period);
`;

// Deduction rules applied to every new income. `living` is the spendable remainder.
// Tithe, savings and emergency are treated as given/set aside by default; only
// community giving is tracked as an action.
export const SEED_ALLOCATION_RULES = [
  { id: "tithe", name: "Tithes / Giving", percent: 10, kind: "tithe", sort: 0 },
  { id: "savings", name: "Savings & Wealth", percent: 15, kind: "saving", sort: 1 },
  { id: "emergency", name: "Emergency fund", percent: 5, kind: "emergency", sort: 2 },
  { id: "community", name: "Community Impact", percent: 5, kind: "community", sort: 3 },
  { id: "living", name: "Spendable (Living)", percent: 65, kind: "living", sort: 4 },
];

// Seed spending categories — two lists: fixed monthly bills, everyday spending.
// Bills start at 0: the first time you pay one you type the amount, and it is
// remembered for every following month.
export const SEED_EXPENSE_CATEGORIES = [
  { id: "rent", name: "Rent / Housing", kind: "bill", dueDay: 1, sort: 0 },
  { id: "utilities", name: "Water & Electricity", kind: "bill", dueDay: 5, sort: 1 },
  { id: "school", name: "School fees", kind: "bill", dueDay: 5, sort: 2 },
  { id: "internet", name: "Internet / Data", kind: "bill", dueDay: 3, sort: 3 },
  { id: "transport-monthly", name: "Transport (monthly)", kind: "bill", dueDay: 1, sort: 4 },
  { id: "health", name: "Health & Insurance", kind: "bill", dueDay: 10, sort: 5 },

  { id: "food", name: "Food & Groceries", kind: "daily", sort: 10 },
  { id: "transport", name: "Transport", kind: "daily", sort: 11 },
  { id: "household", name: "Household items", kind: "daily", sort: 12 },
  { id: "airtime", name: "Airtime", kind: "daily", sort: 13 },
  { id: "personal", name: "Personal care", kind: "daily", sort: 14 },
  { id: "other", name: "Other", kind: "daily", sort: 15 },
];

// Community giving is split into two simple categories.
export const COMMUNITY_CATEGORIES = [
  { id: "ceremonies", name: "Ceremonies", hint: "Weddings, funerals, family events" },
  { id: "society", name: "Society", hint: "Neighbours, church, local causes" },
];

export const SEED_PROJECTS = [
  { id: "water-point", name: "Water point", goalMinor: 50000000, raisedMinor: 32000000 },
  { id: "school-kits", name: "School kits", goalMinor: 20000000, raisedMinor: 4500000 },
];
