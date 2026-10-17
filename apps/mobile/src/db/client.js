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

// Columns the additive migrations must guarantee, per table.
const EXPECTED_COLUMNS = {
  payouts: { category: "TEXT" },
  income_entries: { emergency_minor: "INTEGER NOT NULL DEFAULT 0" },
};

// `PRAGMA table_info(...)` proved unreliable through the prepared-statement API, so
// use the table-valued pragma (a plain SELECT) and treat a failure as "unknown"
// rather than "empty" — that mistake bumped user_version without adding the column.
async function columnNames(db, table) {
  try {
    const rows = await db.getAllAsync("SELECT name FROM pragma_table_info(?)", table);
    return rows.map((r) => r.name);
  } catch (e) {
    console.warn("[db] could not read columns of", table, "-", String(e?.message || e));
    return null;
  }
}

async function ensureColumn(db, table, column, type = "TEXT") {
  const cols = await columnNames(db, table);
  if (cols === null) {
    // Unknown state: attempt the ALTER and let a real failure surface.
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[db] added ${table}.${column}`);
      return true;
    } catch {
      return false;
    }
  }
  if (!cols.length) return false; // table does not exist yet; createSchema makes it
  if (cols.includes(column)) return false;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  console.log(`[db] added ${table}.${column}`);
  return true;
}

// Runs regardless of the stored version, so a version bumped without its column
// (the trap we just hit) repairs itself on the next launch.
async function applyAdditiveMigrations(db) {
  const added = [];
  for (const [table, cols] of Object.entries(EXPECTED_COLUMNS)) {
    for (const [column, type] of Object.entries(cols)) {
      if (await ensureColumn(db, table, column, type)) added.push(`${table}.${column}`);
    }
  }

  const hasEmergency = await db.getFirstAsync("SELECT id FROM allocation_rules WHERE id='emergency'");
  if (!hasEmergency) {
    await run(db,
      `INSERT INTO allocation_rules (id,name,percent,kind,sort,user_id,updated_at,is_deleted,rev)
       VALUES ('emergency','Emergency fund',5,'emergency',2,NULL,?,0,1) ON CONFLICT(id) DO NOTHING`,
      Date.now()
    );
    await run(db, "UPDATE allocation_rules SET percent=65, sort=4 WHERE id='living'");
    await run(db, "UPDATE allocation_rules SET sort=3 WHERE id='community'");
    added.push("allocation_rules.emergency");
  }

  if (added.length) console.log("[db] additive migration:", added.join(", "));
}

// Trust nothing: if the live tables cannot answer the app's own queries, rebuild.
async function verifySchema(db) {
  const probes = [
    "SELECT emergency_minor FROM income_entries LIMIT 1",
    "SELECT category FROM payouts LIMIT 1",
    "SELECT period FROM expenses LIMIT 1",
  ];
  for (const sql of probes) {
    try {
      await db.getAllAsync(sql);
    } catch (e) {
      console.warn("[db] schema check failed:", sql, "-", String(e?.message || e));
      return false;
    }
  }
  return true;
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
    if (version < 2) {
      // Older/unknown model: rebuild rather than half-migrate test rows.
      console.log(`[db] rebuild — new local schema v${SCHEMA_VERSION}`);
      await resetTables(db);
      return;
    }

    await createSchema(db);            // idempotent; creates any missing table
    await applyAdditiveMigrations(db); // idempotent; adds any missing column

    if (!(await verifySchema(db))) {
      console.warn("[db] schema incomplete → rebuilding local tables");
      await resetTables(db);
      return;
    }

    if (version !== SCHEMA_VERSION) {
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      console.log(`[db] migrated v${version} → v${SCHEMA_VERSION}`);
    }
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
