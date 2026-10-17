-- Qubators server schema v0.1 (Postgres 16)
-- Auth tables (Better Auth: email OTP) + domain mirror tables.

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Domain mirror (sync-ready)
CREATE TABLE IF NOT EXISTS categories (
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

CREATE TABLE IF NOT EXISTS income_entries (
  id TEXT PRIMARY KEY,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BIF',
  note TEXT,
  occurred_at BIGINT NOT NULL,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  note TEXT,
  occurred_at BIGINT NOT NULL,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  device_id TEXT,
  user_id TEXT,
  updated_at BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal_minor INTEGER NOT NULL,
  raised_minor INTEGER NOT NULL DEFAULT 0,
  cover_url TEXT,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_income_user_updated ON income_entries (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_user_updated ON categories (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_contributions_user_updated ON contributions (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_expenses_user_updated ON expenses (user_id, updated_at);

-- Seeds: default allocation 10/15/5/70 + demo community projects
INSERT INTO categories (id, name, percent, kind, sort, user_id, updated_at, is_deleted, rev)
VALUES
  ('tithe',     'Tithes / Giving',    10, 'tithe',     0, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1),
  ('savings',   'Savings & Wealth',   15, 'saving',    1, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1),
  ('community', 'Community Impact',    5, 'community', 2, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1),
  ('living',    'Living Expenses',    70, 'living',    3, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT, FALSE, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, name, goal_minor, raised_minor, cover_url, updated_at)
VALUES
  ('water-point', 'Water point', 50000000, 32000000, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT),
  ('school-kits', 'School kits', 20000000,  4500000, NULL, (EXTRACT(EPOCH FROM NOW())*1000)::BIGINT)
ON CONFLICT (id) DO NOTHING;
