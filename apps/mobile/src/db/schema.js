// Phone DDL — raw SQL, no ORM, sync-ready columns on every table.
export const DDL = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, percent REAL NOT NULL,
  kind TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS income_entries (
  id TEXT PRIMARY KEY, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'BIF',
  note TEXT, occurred_at INTEGER NOT NULL,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY, category_id TEXT NOT NULL, amount_minor INTEGER NOT NULL,
  note TEXT, occurred_at INTEGER NOT NULL,
  user_id TEXT, updated_at INTEGER NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, amount_minor INTEGER NOT NULL, device_id TEXT,
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
CREATE INDEX IF NOT EXISTS idx_income_occurred ON income_entries (occurred_at);
`;

export const SEED_CATEGORIES = [
  { id: "tithe", name: "Tithes / Giving", percent: 10, kind: "tithe", sort: 0 },
  { id: "savings", name: "Savings & Wealth", percent: 15, kind: "saving", sort: 1 },
  { id: "community", name: "Community Impact", percent: 5, kind: "community", sort: 2 },
  { id: "living", name: "Living Expenses", percent: 70, kind: "living", sort: 3 },
];

export const SEED_PROJECTS = [
  { id: "water-point", name: "Water point", goalMinor: 50000000, raisedMinor: 32000000 },
  { id: "school-kits", name: "School kits", goalMinor: 20000000, raisedMinor: 4500000 },
];
