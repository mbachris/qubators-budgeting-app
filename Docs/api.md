# API v0.1 (local device only, no Vercel)

Base: `http://localhost:3000` on PC, `http://192.168.1.171:3000` from phone on same WiFi.

## Auth — Better Auth (email OTP)
- `POST /api/auth/email-otp/send-verification-otp` `{ email, type: "sign-in" }`
  OTP is printed to the server console in dev (swap for SMTP later).
- `POST /api/auth/sign-in/email-otp` `{ email, otp, name? }` → sets session cookie, auto-registers.
- `GET /api/auth/get-session` → current session/user.

## Sync
- `POST /sync/push` `{ deviceId, rows: [{ table, id, data, updatedAt, isDeleted? }] }`
  Tables: `categories | income_entries | expenses | contributions`.
  LWW on `updated_at` (ms). Older incoming rows returned in `conflicts` so the phone adopts the server row.
  Auth optional: logged-in rows get `user_id`; guest pushes keep `user_id` NULL.
- `GET /sync/pull?since=<ms>` → `{ rows: [{table, rows}], serverTime }`. Guest → empty.
- `GET /sync/projects` → verified community projects (public).

## Blobs — Cloudflare R2
- `POST /uploads/presign` `{ filename, contentType }` (session required) → `{ url, key, expiresIn }`
  Phone PUTs directly to R2. Use for backup JSON, project covers. Never ledger truth.
  Returns `501 r2_not_configured` until `R2_*` env vars are set.

## Health
- `GET /health` → `{ ok: true, service: "qubators-server" }`
