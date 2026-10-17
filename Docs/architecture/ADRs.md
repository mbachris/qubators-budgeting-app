# ADR-001 Stack: Expo
- Chosen: Expo React Native + TypeScript + EAS Build.
- Why: single codebase to APK, EAS preview APK without local Android SDK, OTA later.
- Rejected: Flutter (rewrite cost), native Kotlin (slow for solo AI-assisted).
# ADR-002 Dual storage
- Phone SQLite (expo-sqlite) truth offline. Server Postgres 16 Docker truth online.
- All tables: id uuid, user_id nullable, updated_at, is_deleted, rev. Outbox sync_queue on phone.
- R2 blobs only (backups/images), presigned from server. No ledger truth in R2.
# ADR-005 Auth (Better Auth, optional)
- Guest default full-function. Settings > Cloud Sync email OTP via Better Auth (Hono + Drizzle pg).
- Login backfills user_id, pushes queue. Logout keeps local. Secrets server-only.
