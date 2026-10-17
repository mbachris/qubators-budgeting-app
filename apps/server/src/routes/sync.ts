import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { auth } from "../auth";

export const sync = new Hono();

// Tables that participate in sync (whitelist — no SQL injection via table name)
const TABLES = ["categories", "income_entries", "expenses", "contributions"] as const;
type TableName = (typeof TABLES)[number];

async function sessionUser(headers: Headers) {
  const s = await auth.api.getSession({ headers });
  return s?.user ?? null;
}

// Push phone rows → server. Last-write-wins on updated_at (ms).
sync.post("/push", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  const body = await c.req.json<{
    deviceId?: string;
    rows: Array<{ table: TableName; id: string; data: Record<string, unknown>; updatedAt: number; isDeleted?: boolean }>;
  }>();
  const rows = body.rows ?? [];
  const applied: string[] = [];
  const conflicts: Array<{ table: string; id: string; serverRow: unknown }> = [];

  for (const r of rows) {
    if (!TABLES.includes(r.table)) continue;

    const existing = await db.execute(
      sql`SELECT * FROM ${sql.raw(r.table)} WHERE id = ${r.id}`
    );
    const current = existing.rows?.[0] as { updated_at?: number } | undefined;

    if (current && Number(current.updated_at) >= r.updatedAt) {
      conflicts.push({ table: r.table, id: r.id, serverRow: current });
      continue; // server is newer → phone adopts server row
    }

    const payload = { ...r.data, id: r.id };
    if (user) payload.user_id = user.id;
    payload.updated_at = r.updatedAt;
    if (typeof r.isDeleted === "boolean") payload.is_deleted = r.isDeleted;

    const cols = Object.keys(payload);
    const vals = cols.map((k) => payload[k]);
    const setClause = cols.filter((k) => k !== "id").map((k) => `${k} = EXCLUDED.${k}`).join(", ");

    await db.execute(
      sql`INSERT INTO ${sql.raw(r.table)} (${sql.raw(cols.join(", "))})
          VALUES (${sql.join(vals.map((v) => sql`${v}`), sql`, `)})
          ON CONFLICT (id) DO UPDATE SET ${sql.raw(setClause)}`
    );
    applied.push(r.id);
  }

  return c.json({ ok: true, applied, conflicts, serverTime: Date.now() });
});

// Pull server rows → phone (since ms). Guests get nothing personal.
sync.get("/pull", async (c) => {
  const user = await sessionUser(c.req.raw.headers);
  const since = Number(c.req.query("since") ?? 0);
  if (!user) {
    return c.json({ rows: [], serverTime: Date.now(), note: "guest: no personal rows" });
  }
  const out: Array<{ table: TableName; rows: unknown[] }> = [];
  for (const t of TABLES) {
    const res = await db.execute(
      sql`SELECT * FROM ${sql.raw(t)} WHERE user_id = ${user.id} AND updated_at > ${since}`
    );
    out.push({ table: t, rows: res.rows ?? [] });
  }
  return c.json({ rows: out, serverTime: Date.now() });
});

// Verified community projects (public, cheap to serve).
sync.get("/projects", async (c) => {
  const res = await db.execute(sql`SELECT * FROM projects ORDER BY id`);
  return c.json({ rows: res.rows ?? [], serverTime: Date.now() });
});
