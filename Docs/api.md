# API v0.1 (local device only, no Vercel)

Base: `http://localhost:3000` on PC, `http://<PC-LAN-IP>:3000` from phone on same WiFi (editable in the app under Settings → Server URL).

## Auth — Better Auth (email OTP)
- `POST /api/auth/email-otp/send-verification-otp` `{ email, type: "sign-in" }`
  OTP is printed to the server console in dev (swap for SMTP later).
- `POST /api/auth/sign-in/email-otp` `{ email, otp, name? }` → sets session cookie, auto-registers.
- `GET /api/auth/get-session` → current session/user.

## Sync
- `POST /sync/push` `{ deviceId, rows: [{ table, id, data, updatedAt, isDeleted? }] }`
  Tables: `allocation_rules | income_entries | expense_categories | expenses | payouts`.
  LWW on `updated_at` (ms). Older incoming rows returned in `conflicts` so the phone adopts the server row.
  Auth optional: logged-in rows get `user_id`; guest pushes keep `user_id` NULL.
- `GET /sync/pull?since=<ms>` → `{ rows: [{table, rows}], serverTime }`. Guest → empty.
- `GET /sync/projects` → verified community projects (public). `raised_minor` = seeded amount + sum of
  community `payouts` for that project, so the tally grows as members give.

## Money model (v2)
- `allocation_rules` — deduction rules applied to every income: tithe 10%, savings 15%, emergency 5%,
  community 5%; `living` (65%) is the spendable remainder.
- `income_entries` — each row stores its own snapshot: `tithe_minor`, `savings_minor`, `emergency_minor`,
  `community_minor`, `spendable_minor`, plus `period` (`YYYY-MM`).
- `expense_categories` — user-defined spending categories, `kind = 'bill' | 'daily' | 'goal'`
  (`goal` = a planned purchase with an optional `target_minor`, e.g. a car or a trip).
- `expenses` — spending inside a month pot, tagged with `category_id` and `period`.
- `payouts` — community giving only: `bucket='community'` with `category = ceremonies | society`.
  Tithe, savings and emergency are treated as given automatically, so they need no payout rows.

## Blobs — Cloudflare R2
- `POST /uploads/presign` `{ filename, contentType }` (session required) → `{ url, key, expiresIn }`
  Phone PUTs directly to R2. Use for backup JSON, project covers. Never ledger truth.
  Returns `501 r2_not_configured` until `R2_*` env vars are set.

## Health
- `GET /health` → `{ ok: true, service: "qubators-server" }`
