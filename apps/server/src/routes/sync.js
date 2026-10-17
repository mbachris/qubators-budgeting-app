import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { auth } from "../auth.js";

export const sync = new Hono();

// Whitelist table → allowed columns (snake_case). Nothing is interpolated from raw user input.
const COLUMNS = {
  allocation_rules: ["id", "name", "percent", "kind", "sort", "user_id", "updated_at", "is_deleted", "rev"],
  income_entries: [
    "id", "amount_minor", "currency", "note", "occurred_at", "period",
    "tithe_minor", "savings_minor", "emergency_minor", "community_minor", "spendable_minor",
    "user_id", "updated_at", "is_deleted", "rev",
  ],
  expense_categories: [
    "id", "name", "kind", "default_amount_minor", "due_day", "sort",
    "user_id", "updated_at", "is_deleted", "rev",
  ],
  expenses: ["id", "category_id", "period", "amount_minor", "note", "occurred_at", "user_id", "updated_at", "is_deleted", "rev"],
  payouts: ["id", "bucket", "category", "project_id", "amount_minor", "note", "occurred_at", "period", "user_id", "updated_at", "is_deleted", "rev"],
};
const TABLES = Object.keys(COLUMNS);

const toSnake = (s) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

async function sessionUser(headers) {
  const s = await auth.api.getSession({ headers });
  return s?.user ?? null;
}

// Push phone rows → server. Last-write-wins on updated_at (ms).
sync.post("/push", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  const body = await c.req.json();
  const rows = body.rows ?? [];
  const applied = [];
  const conflicts = [];

  for (const r of rows) {
    if (!TABLES.includes(r.table)) continue;
    const allowed = COLUMNS[r.table];

    const existing = await db.execute(sql`SELECT * FROM ${sql.raw(r.table)} WHERE id = ${r.id}`);
    const current = existing.rows?.[0];

    if (current && Number(current.updated_at) >= r.updatedAt) {
      conflicts.push({ table: r.table, id: r.id, serverRow: current });
      continue; // server is newer → phone adopts server row
    }

    // Normalize camelCase payload keys → snake_case columns, keep only allowed ones.
    const payload = { id: r.id, updated_at: r.updatedAt };
    for (const [k, v] of Object.entries(r.data ?? {})) {
      const col = toSnake(k);
      if (allowed.includes(col)) payload[col] = v;
    }
    if (user) payload.user_id = user.id;
    if (typeof r.isDeleted === "boolean") payload.is_deleted = r.isDeleted;

    const cols = Object.keys(payload).filter((k) => allowed.includes(k));
    const values = cols.map((k) => payload[k]);
    const updates = cols.filter((k) => k !== "id").map((k) => `${k} = EXCLUDED.${k}`).join(", ");

    await db.execute(
      updates
        ? sql`INSERT INTO ${sql.raw(r.table)} (${sql.raw(cols.join(", "))})
               VALUES (${sql.join(values.map((v) => sql`${v}`), sql`, `)})
               ON CONFLICT (id) DO UPDATE SET ${sql.raw(updates)}`
        : sql`INSERT INTO ${sql.raw(r.table)} (${sql.raw(cols.join(", "))})
               VALUES (${sql.join(values.map((v) => sql`${v}`), sql`, `)})
               ON CONFLICT (id) DO NOTHING`
    );
    applied.push(r.id);
  }

  return c.json({ ok: true, applied, conflicts, serverTime: Date.now() });
});

// Pull server rows → phone (since ms). Guests receive no personal rows.
sync.get("/pull", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  const since = Number(c.req.query("since") ?? 0);
  if (!user) {
    return c.json({ rows: [], serverTime: Date.now(), note: "guest: no personal rows" });
  }
  const out = [];
  for (const t of TABLES) {
    const res = await db.execute(
      sql`SELECT * FROM ${sql.raw(t)} WHERE user_id = ${user.id} AND updated_at > ${since}`
    );
    out.push({ table: t, rows: res.rows ?? [] });
  }
  return c.json({ rows: out, serverTime: Date.now() });
});

// Verified community projects (public) with community payouts folded into `raised_minor`.
sync.get("/projects", async (c) => {
  const res = await db.execute(sql`
    SELECT p.id, p.name, p.goal_minor, p.cover_url, p.updated_at,
           (p.raised_minor + COALESCE((
             SELECT SUM(x.amount_minor) FROM payouts x
             WHERE x.project_id = p.id AND x.is_deleted = FALSE
           ), 0))::BIGINT AS raised_minor
    FROM projects p ORDER BY p.id
  `);
  return c.json({ rows: res.rows ?? [], serverTime: Date.now() });
});
