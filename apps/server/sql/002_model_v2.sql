-- Qubators server schema v2 (Postgres 16)
-- Model: allocations are DEDUCTIONS off each income; the 70% remainder is the
-- spendable pot of that month. Spending uses user-defined expense categories.
-- Dev reset: drops the v1 domain tables, so only test data is lost.

DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS contributions CASCADE;
DROP TABLE IF EXISTS income_entries CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS allocation_rules CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Deduction rules applied to every new income (living = spendable remainder).
CREATE TABLE allocation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  percent DOUBLE PRECISION NOT NULL,
  kind TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

-- Each income carries its own deduction snapshot.
CREATE TABLE income_entries (
  id TEXT PRIMARY KEY,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BIF',
  note TEXT,
  occurred_at BIGINT NOT NULL,
  period TEXT NOT NULL,
  tithe_minor INTEGER NOT NULL DEFAULT 0,
  savings_minor INTEGER NOT NULL DEFAULT 0,
  emergency_minor INTEGER NOT NULL DEFAULT 0,
  community_minor INTEGER NOT NULL DEFAULT 0,
  spendable_minor INTEGER NOT NULL DEFAULT 0,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

-- User-defined spending categories: 'bill' (fixed monthly) or 'daily'.
CREATE TABLE expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'daily',
  default_amount_minor INTEGER NOT NULL DEFAULT 0,
  due_day INTEGER,
  sort INTEGER NOT NULL DEFAULT 0,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  period TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  note TEXT,
  occurred_at BIGINT NOT NULL,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

-- Money actually moved out of a set-aside bucket (tithe given, savings moved,
-- community given — optionally to a project).
CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  category TEXT,
  project_id TEXT,
  amount_minor INTEGER NOT NULL,
  note TEXT,
  occurred_at BIGINT NOT NULL,
  period TEXT NOT NULL,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal_minor INTEGER NOT NULL,
  raised_minor INTEGER NOT NULL DEFAULT 0,
  cover_url TEXT,
  updated_at BIGINT NOT NULL
);

CREATE INDEX idx_income_user_updated ON income_entries (user_id, updated_at);
CREATE INDEX idx_income_period ON income_entries (period);
CREATE INDEX idx_expenses_user_updated ON expenses (user_id, updated_at);
CREATE INDEX idx_expenses_period ON expenses (period);
CREATE INDEX idx_payouts_user_updated ON payouts (user_id, updated_at);
CREATE INDEX idx_expense_categories_user_updated ON expense_categories (user_id, updated_at);
CREATE INDEX idx_allocation_rules_user_updated ON allocation_rules (user_id, updated_at);

-- Seed: default deduction rules 10 / 15 / 5 / 70.
INSERT INTO allocation_rules (id, name, percent, kind, sort, user_id, updated_at, is_deleted, rev)
VALUES
  ('tithe',     'Tithes / Giving',   10, 'tithe',     0, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1),
  ('savings',   'Savings & Wealth',  15, 'saving',    1, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1),
  ('emergency', 'Emergency fund',     5, 'emergency', 2, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1),
  ('community', 'Community Impact',   5, 'community', 3, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1),
  ('living',    'Spendable (Living)', 65, 'living',   4, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1)
ON CONFLICT (id) DO NOTHING;

-- Seed: demo community projects.
INSERT INTO projects (id, name, goal_minor, raised_minor, cover_url, updated_at)
VALUES
  ('water-point', 'Water point', 50000000, 32000000, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT),
  ('school-kits', 'School kits', 20000000,  4500000, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT)
ON CONFLICT (id) DO NOTHING;
