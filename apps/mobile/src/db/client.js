import * as SQLite from "expo-sqlite";
import { DDL, SEED_CATEGORIES, SEED_PROJECTS } from "./schema";
import { now } from "../lib/id";

let dbPromise = null;

function statements(sql) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function migrate(db) {
  for (const stmt of statements(DDL)) {
    try {
      await db.execAsync(stmt);
    } catch (e) {
      console.warn("[db] DDL failed:", String(e?.message || e), stmt.slice(0, 60));
      throw e;
    }
  }
  const t = now();
  for (const c of SEED_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (id,name,percent,kind,sort,user_id,updated_at,is_deleted,rev)
       VALUES (?,?,?,?,?,NULL,?,0,1) ON CONFLICT(id) DO NOTHING`,
      c.id, c.name, c.percent, c.kind, c.sort, t
    );
  }
  for (const p of SEED_PROJECTS) {
    await db.runAsync(
      `INSERT INTO projects_cache (id,name,goal_minor,raised_minor,cover_url,updated_at)
       VALUES (?,?,?,?,NULL,?) ON CONFLICT(id) DO NOTHING`,
      p.id, p.name, p.goalMinor, p.raisedMinor, t
    );
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
