import { getDB } from "./client";
import { uuid, now } from "../lib/id";

export async function listCategories() {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT id,name,percent,kind,sort FROM categories WHERE is_deleted=0 ORDER BY sort"
  );
}

export async function listProjects() {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT id,name,goal_minor AS goalMinor,raised_minor AS raisedMinor,cover_url AS coverUrl FROM projects_cache"
  );
}

export async function listIncome() {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT id, amount_minor AS amountMinor, currency, note, occurred_at AS occurredAt
     FROM income_entries WHERE is_deleted=0 ORDER BY occurred_at DESC`
  );
}

export async function addIncome({ amountMinor, currency = "BIF", note = null }) {
  const db = await getDB();
  const t = now();
  const id = uuid();
  await db.runAsync(
    `INSERT INTO income_entries (id,amount_minor,currency,note,occurred_at,user_id,updated_at,is_deleted,rev)
     VALUES (?,?,?,?,?,NULL,?,0,1)`,
    id, amountMinor, currency, note, t, t
  );
  await enqueue("income_entries", id, "upsert", { id, amountMinor, currency, note, occurredAt: t, updatedAt: t });
  return { id, amountMinor, currency, note, occurredAt: t };
}

export async function listContributions() {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT id, project_id AS projectId, amount_minor AS amountMinor, updated_at AS updatedAt FROM contributions WHERE is_deleted=0"
  );
}

export async function addContribution({ projectId, amountMinor }) {
  const db = await getDB();
  const t = now();
  const id = uuid();
  await db.runAsync(
    `INSERT INTO contributions (id,project_id,amount_minor,device_id,user_id,updated_at,is_deleted,rev)
     VALUES (?,?,?,?,NULL,?,0,1)`,
    id, projectId, amountMinor, "local-device", t
  );
  await enqueue("contributions", id, "upsert", { id, projectId, amountMinor, updatedAt: t });
  return { id, projectId, amountMinor, updatedAt: t };
}

export async function enqueue(tableName, rowId, op, payload) {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO sync_queue (id,table_name,row_id,op,payload,created_at,tries) VALUES (?,?,?,?,?,?,0)`,
    uuid(), tableName, rowId, op, JSON.stringify(payload), now()
  );
}

export async function queueCount() {
  const db = await getDB();
  const r = await db.getFirstAsync("SELECT COUNT(*) AS n FROM sync_queue");
  return r?.n ?? 0;
}

export async function exportAll() {
  const [categories, income, contributions] = await Promise.all([
    listCategories(), listIncome(), listContributions(),
  ]);
  return { version: 1, exportedAt: now(), categories, income, contributions };
}

// ---- Sync queue helpers (Phase 4 online side) ----
const SYNC_TABLES = ["categories", "income_entries", "expenses", "contributions"];

export async function listQueue(limit = 200) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT id, table_name AS tableName, row_id AS rowId, op, payload, created_at AS createdAt, tries
     FROM sync_queue ORDER BY created_at ASC LIMIT ?`,
    limit
  );
}

export async function deleteQueue(ids) {
  if (!ids.length) return;
  const db = await getDB();
  const placeholders = ids.map(() => "?").join(",");
  await db.runAsync(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ...ids);
}

// Server row → local row (identical snake_case columns). TABLE is whitelisted.
export async function applyServerRow(table, tableName, row) {
  if (!SYNC_TABLES.includes(tableName)) return;
  const cols = Object.keys(row).filter((k) => k !== "id");
  if (!cols.length) return;
  const db = await getDB();
  await db.runAsync(
    `UPDATE ${tableName} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
    ...cols.map((c) => row[c]),
    row.id
  );
}
