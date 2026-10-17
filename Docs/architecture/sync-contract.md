# Sync contract v0.1 (phone SQLite ⇄ server Postgres, Better Auth optional)

Phone is truth offline. Server is truth online. Last-write-wins by `updatedAt`, deletes win via `isDeleted=1`.

## Push (phone → server)
`POST /sync/push` `{ deviceId, rows: [{ table, id, data, updatedAt, isDeleted }] }`
- Server upserts where incoming.updatedAt > existing.updatedAt.
- Response `{ ok, applied: [ids], conflicts: [{ id, serverRow }] }` — phone applies serverRow on conflict.

Queue: every local write inserts into `sync_queue { tableName, rowId, op, payload }`. `Sync Now` drains FIFO, increments `tries`, drops on 200.

## Pull (server → phone)
`GET /sync/pull?since=<ms>&userId=<nullable>` → `{ rows: [...], serverTime }`
- Guest (`userId` null): only `projects` cache + nothing personal.
- Logged-in: own rows + projects. Phone merges same LWW rule.

## R2 (blobs only)
`POST /uploads/presign` `{ filename, contentType }` → `{ url, publicUrl }` (Better Auth session required).
Phone PUTs file directly to R2. Used for: backup JSON, project covers, avatars. Never ledger truth.

## IDs
UUID v4 strings both sides. `userId` null = Local Vault. Login backfills `userId` on phone rows then pushes.
