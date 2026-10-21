# BudgetSafe

Offline-first budgeting + community impact. Local Vault always on, Cloud Sync optional.
(Repo and docs still say "Qubators" — that is the project's working name.)

**Download the Android app:** [BudgetSafe 1.0.0 APK](https://github.com/mbachris/qubators-budgeting-app/releases/latest) — Android 7+, sideload, no account needed. Product requirements are in [`Docs/PRD.md`](Docs/PRD.md).

Docs: `Docs/project_concept.md` (original vision), `Docs/PRD.md` (what ships today), `Docs/implementation-plan.md`, `Docs/design-system.md`, `Docs/architecture/ADRs.md`

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
