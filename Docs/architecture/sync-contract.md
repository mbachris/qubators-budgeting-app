# Sync contract v0.3 (phone SQLite ⇄ server Postgres, Better Auth optional)

Phone is truth offline. Server is truth online. Last-write-wins by `updatedAt`, deletes win via `isDeleted=1`.

Synced tables (v2 model): `allocation_rules`, `income_entries`, `expense_categories`, `expenses`, `payouts`.
`expense_categories.kind` is `bill | daily | goal`; `goal` rows carry `target_minor` (planned purchase).

## Push (phone → server)
`POST /sync/push` `{ deviceId, rows: [{ table, id, data, updatedAt, isDeleted }] }`
- Server upserts where incoming.updatedAt > existing.updatedAt.
- `data` keys are camelCase; the server converts them to `snake_case` and keeps only whitelisted columns.
- Response `{ ok, applied: [ids], conflicts: [{ table, id, serverRow }] }` — phone adopts `serverRow` on conflict.
  Pulled rows are normalised on the phone (Postgres returns BIGINT as string, BOOLEAN as true/false).

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
