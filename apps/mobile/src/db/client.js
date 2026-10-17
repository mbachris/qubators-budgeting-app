import * as SQLite from "expo-sqlite";
import {
  DDL, SCHEMA_VERSION, SEED_ALLOCATION_RULES, SEED_EXPENSE_CATEGORIES, SEED_PROJECTS,
} from "./schema";
import { now } from "../lib/id";

let dbPromise = null;

function statements(sql) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

// expo-sqlite rejects `undefined` bindings, so normalise before sending them.
const bind = (args) => args.map((a) => (a === undefined ? null : a));
const run = (db, sql, ...args) => db.runAsync(sql, ...bind(args));

async function dropEverything(db) {
  const tables = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  for (const t of tables) {
    await db.execAsync(`DROP TABLE IF EXISTS ${t.name}`);
  }
  console.log("[db] reset — local tables dropped for schema v" + SCHEMA_VERSION);
}

async function createSchema(db) {
  for (const stmt of statements(DDL)) {
    try {
      await db.execAsync(stmt);
    } catch (e) {
      console.warn("[db] DDL failed:", String(e?.message || e), stmt.slice(0, 60));
      throw e;
    }
  }
}

async function seed(db) {
  const t = now();
  for (const r of SEED_ALLOCATION_RULES) {
    await run(db,
      `INSERT INTO allocation_rules (id,name,percent,kind,sort,user_id,updated_at,is_deleted,rev)
       VALUES (?,?,?,?,?,NULL,?,0,1) ON CONFLICT(id) DO NOTHING`,
      r.id, r.name, r.percent, r.kind, r.sort, t
    );
  }
  for (const c of SEED_EXPENSE_CATEGORIES) {
    await run(db,
      `INSERT INTO expense_categories (id,name,kind,default_amount_minor,due_day,sort,user_id,updated_at,is_deleted,rev)
       VALUES (?,?,?,0,?,?,NULL,?,0,1) ON CONFLICT(id) DO NOTHING`,
      c.id, c.name, c.kind, c.dueDay ?? null, c.sort, t
    );
  }
  for (const p of SEED_PROJECTS) {
    await run(db,
      `INSERT INTO projects_cache (id,name,goal_minor,raised_minor,cover_url,updated_at)
       VALUES (?,?,?,?,NULL,?) ON CONFLICT(id) DO NOTHING`,
      p.id, p.name, p.goalMinor, p.raisedMinor, t
    );
  }
}

async function columnNames(db, table) {
  try {
    const rows = await db.getAllAsync(`PRAGMA table_info(${table})`);
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

async function ensureColumn(db, table, column, type = "TEXT") {
  const cols = await columnNames(db, table);
  if (cols.length && !cols.includes(column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`[db] added ${table}.${column}`);
  }
}

async function resetTables(db) {
  await dropEverything(db);
  await createSchema(db);
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  await seed(db);
}

async function migrate(db) {
  const row = await db.getFirstAsync("PRAGMA user_version");
  const version = row?.user_version ?? 0;

  try {
    if (version === SCHEMA_VERSION) {
      await createSchema(db); // idempotent, covers newly added tables
      return;
    }

    if (version >= 2) {
      // Additive migrations: community category (v3) and the emergency bucket (v4).
      await ensureColumn(db, "payouts", "category", "TEXT");
      await ensureColumn(db, "income_entries", "emergency_minor", "INTEGER NOT NULL DEFAULT 0");
      await run(db,
        `INSERT INTO allocation_rules (id,name,percent,kind,sort,user_id,updated_at,is_deleted,rev)
         VALUES ('emergency','Emergency fund',5,'emergency',2,NULL,?,0,1) ON CONFLICT(id) DO NOTHING`,
        Date.now()
      );
      await run(db,"UPDATE allocation_rules SET percent=65, sort=4 WHERE id='living'");
      await run(db,"UPDATE allocation_rules SET sort=3 WHERE id='community'");
      await createSchema(db);
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      console.log(`[db] migrated v${version} → v${SCHEMA_VERSION}`);
      return;
    }

    // Older/unknown model: reset local data rather than half-migrating test rows.
    console.log(`[db] reset — rebuilding local tables for schema v${SCHEMA_VERSION}`);
    await resetTables(db);
  } catch (e) {
    // Never leave the app with an unusable database.
    console.warn("[db] migration failed:", String(e?.message || e), "→ resetting local tables");
    await resetTables(db);
  }
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("qubators.db");
      await migrate(db);
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

// Used by Settings → "Reset local data".
export async function resetDB() {
  const db = await getDB();
  await resetTables(db);
}
