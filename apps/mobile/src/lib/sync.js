import { API_URL, getToken, pushRows, pull, pullProjects, health } from "./api";
import { listQueue, deleteQueue, applyServerRow } from "../db/repo";

export const DEVICE_ID = "local-device";

// Drain the local outbox → server (LWW). Returns a status summary for the UI.
export async function syncNow(lastPulledAt = 0) {
  const token = await getToken();
  if (!token) return { state: "signed-out" };

  const h = await health();
  if (!h.ok) return { state: "offline" };

  const queued = await listQueue();
  const rows = queued.map((q) => ({
    table: q.tableName,
    id: q.rowId,
    data: q.payload ? JSON.parse(q.payload) : {},
    updatedAt: q.createdAt,
  }));

  let applied = 0;
  let conflicts = 0;

  if (rows.length) {
    const push = await pushRows(rows, DEVICE_ID);
    if (!push.ok) return { state: "error", status: push.status, data: push.data };
    applied = push.data?.applied?.length ?? 0;
    for (const con of push.data?.conflicts ?? []) {
      await applyServerRow(con.id, con.table, con.serverRow);
      conflicts++;
    }
    await deleteQueue(queued.map((q) => q.id));
  }

  const pulled = await pull(lastPulledAt);
  for (const group of pulled.data?.rows ?? []) {
    for (const row of group.rows ?? []) {
      await applyServerRow(row.id, group.table, row);
    }
  }

  const projects = await pullProjects();
  if (projects.ok) await cacheProjects(projects.data?.rows ?? []);

  return {
    state: "synced",
    applied,
    conflicts,
    pulled: (pulled.data?.rows ?? []).reduce((a, g) => a + (g.rows?.length ?? 0), 0),
    at: Date.now(),
  };
}

export async function cacheProjects(rows) {
  const { getDB } = await import("../db/client");
  const db = await getDB();
  for (const p of rows) {
    await db.runAsync(
      `INSERT INTO projects_cache (id,name,goal_minor,raised_minor,cover_url,updated_at)
       VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
       name=EXCLUDED.name, goal_minor=EXCLUDED.goal_minor,
       raised_minor=EXCLUDED.raised_minor, cover_url=EXCLUDED.cover_url, updated_at=EXCLUDED.updated_at`,
      p.id, p.name, p.goal_minor, p.raised_minor, p.cover_url ?? null, Number(p.updated_at ?? Date.now())
    );
  }
}

export const apiUrl = API_URL;
