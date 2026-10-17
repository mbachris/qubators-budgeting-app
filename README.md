# Qubators Budgeting App

Offline-first budgeting + community impact. Local Vault always on, Cloud Sync optional.

Docs: `Docs/project_concept.md`, `Docs/implementation-plan.md`, `Docs/design-system.md`

## Run (local device only, no Vercel)
1. Install Node 20+ and Docker Desktop.
2. `docker compose up -d` — local Postgres `localhost:5432` (user `qubators`, db `qubators`).
3. Server: `cd apps/server && cp .env.example .env && npm i && npm run dev` — `http://localhost:3000`.
4. Phone on same WiFi: set `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000` (your PC LAN IP), `npx expo start`.
5. APK: `eas build -p android --profile preview`.

## Structure
- `apps/mobile/` Expo app (SQLite source of truth offline)
- `apps/server/` Hono + Better Auth + Drizzle → local Postgres, presigns R2
- `packages/domain/` pure `allocateIncome()` + tests
- `Docs/` concept, plan, design system, architecture
