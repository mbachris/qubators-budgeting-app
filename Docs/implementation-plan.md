# Qubators Budgeting App — Detailed Implementation Plan (Phases)

Source: `Docs/project_concept.md` — offline-first mobile APK, local storage, auto-allocation 10% Tithes / 15% Savings / 5% Community / remainder Living Expenses, customizable, free core + freemium later.

Current state:
- Local: `Docs/project_concept.md`, `Docs/implementation-plan.md` (this file)
- GitHub `mbachris/qubators-budgeting-app`: `README.md` + `Docs/project_concept.md`
- Auth: `gh` logged in as `mbachris` (keyring, https) — persistent
- v1 scope: BOTH Local Vault and Cloud Sync as first-class features. No Supabase. No Vercel.

Locked decisions (2026-10-16):
- DB: SQLite on phone (expo-sqlite, source of truth offline) + Postgres 16 in Docker on local device (server store). No Supabase.
- Auth: Better Auth (email OTP/magic-link) in local Node backend, Drizzle adapter to local Postgres.
- Storage: Cloudflare R2 (S3-compatible) for blobs — backups, avatars, project images. Presigned URLs from backend.
- Hosting: local device only. Backend `http://192.168.x.x:3000` on LAN for phone testing, optional Cloudflare Tunnel later. No Vercel.

Stack: Expo (React Native + TypeScript) + EAS Build to APK, expo-sqlite + Drizzle (phone), Hono + Better Auth + Drizzle + Postgres 16 (server, Docker Compose), Zustand, React Navigation.

---

## Phase 0 — Foundation & Repo Hygiene
Goal: reproducible builds, clean main.
Deliverables:
- `README.md` (phone + server run, LAN URL, EAS), `LICENSE` (MIT), `.gitignore`, `.editorconfig`, Prettier + ESLint + TS strict
- `apps/mobile/app.json` / `eas.json` (preview APK), `apps/server/` Hono scaffold, `docker-compose.yml` (postgres:16, adminer optional)
- `Docs/` index, `CHANGELOG.md`
Acceptance: `npm i && npx expo start` works; `docker compose up -d` gives Postgres; `eas build -p android --profile preview` produces APK.
Tasks: 1) Expo TS blank in `apps/mobile` 2) Hono + Drizzle scaffold in `apps/server` 3) Compose + README LAN setup 4) tag `v0.0.0`.

## Phase 1 — Design System
Goal: build UI once, reuse everywhere, light/dark + a11y.
Deliverables: `Docs/design-system.md` + `src/theme/` + `src/components/`
- Tokens: colors, spacing 4pt, radius, typography (EN/FR + local labels), elevation, motion 150/250ms
- Components: Button, TextInput (currency), Card, ListRow, ProgressRing/Bar, SegmentedControl, EmptyState, ErrorState, Skeleton, Modal/Sheet, Toast, SyncBadge (Local Vault / Synced / Pending N)
- Rules: min touch 44pt, contrast AA, currency BIF/RWF/USD formatting, no hardcoded colors in screens
- Screens: Dashboard, Add Income (live split), Expenses, Community, Settings (categories + Storage: Local Vault / Cloud Sync status + Backup to R2)
Acceptance: `/design` preview renders all components in both themes.

## Phase 2 — Architectural Decisions (ADRs)
Goal: lock decisions for dual storage.
Deliverables: `Docs/architecture/ADR-00X.md` + `Docs/architecture/overview.md`
- ADR-001 Stack: Expo over Flutter/Kotlin for AI-assisted speed + EAS APK.
- ADR-002 Storage dual: phone SQLite is truth offline; server Postgres 16 local-Docker is truth online; every table `id uuid, user_id nullable, updated_at, is_deleted, rev`. Outbox `sync_queue` on phone. R2 holds blobs only, never ledger truth.
- ADR-003 State: Zustand + TanStack Query (local-first) ; pure domain in `src/domain/`.
- ADR-004 Navigation: bottom tabs (Dashboard/Add/Community/Settings) + stack modals.
- ADR-005 Auth (Better Auth, optional): guest default full-function; Settings > Cloud Sync opt-in via email OTP; backfill `user_id` on login; logout keeps local data. Secrets (`BETTER_AUTH_SECRET`, `DATABASE_URL`, `R2_*`) server-side only, never in app.
- ADR-006 API: Hono REST `/auth/*` (Better Auth), `/sync/push|pull`, `/uploads/presign` → R2. LAN-first, no Vercel. OpenAPI-lite in `Docs/api.md`.
- ADR-007 Testing: Vitest domain + sync-merge tests, Maestro smoke later.
Acceptance: ADRs merged, LAN sync diagram approved.

## Phase 3 — Domain Model & Allocation Engine
Goal: correct money math, shared phone/server.
Deliverables: `packages/domain/` + tests
- Entities: Category, IncomeEntry, Expense, Contribution, Project — all sync-ready fields
- `allocateIncome(amountMinor, rules)`: minor-units, largest-remainder, remainder to Living, totals<=100 validation, custom rules
- Defaults: 10/15/5/remainder per concept, editable
Acceptance: `npm test` green, sum(outputs)==input property test.

## Phase 4 — Persistence (Dual)
Goal: offline works, online syncs, blobs in R2.
Deliverables:
- Phone `apps/mobile/src/db/`: Drizzle sqlite schema + migrations + seed + `sync_queue`
- Server `apps/server/src/db/`: Drizzle pg schema (users via Better Auth tables + mirror of domain tables + `device_id`), migrations
- `docker-compose.yml`: postgres:16-alpine, volume `pgdata`, healthcheck
- R2: bucket `qubators-backups`, presign flow docs, backup JSON upload from Settings
- Seed: default categories + 2 sample projects (server + phone)
Acceptance: airplane-mode CRUD intact; online push/pull converges; backup file appears in R2.

## Phase 5 — App Shell, Screens & Storage Features
Goal: budgeting loop + both storages visible as features.
- Tabs: Dashboard (month totals, per-category bars, storage badge), Add Income (live split → save), Expenses, Community (list + Give → local ledger + queue), Settings (categories edit, Storage cards: Local Vault Always On / Cloud Sync Sign-in, Backup to R2, Export/Import JSON)
- Sync UI: `Synced HH:MM`, `Pending N`, `Offline — will sync`, manual Sync Now
Acceptance: 100,000 → 10k/15k/5k/70k offline; login → pending pushes; logout → local intact.

## Phase 6 — Community + R2 Media
- `projects.json` cache + server `/projects` source, local contributions + queued `projectId, amountMinor, createdAt, deviceId`; project cover images via R2 URLs
Acceptance: Give works offline, syncs online, images load from R2.

## Phase 7 — Quality, Onboarding & Polish
- Onboarding: choose Local Vault only vs Enable Cloud Sync (optional, skippable); icon/splash; perf <2s cold start; `Docs/qa.md` matrix Android 10–15, dark, large fonts, airplane pass.

## Phase 8 — Build, Release (Local Host)
- `eas build -p android --profile preview` → APK in GitHub Release `v0.1.0`; server run docs `docker compose up -d && bun run dev`; LAN IP setup for phone; tunnel optional note.
Acceptance: APK installs, works offline + syncs on LAN.

## Phase 9 — Later (Not v1)
- Multi-device conflict UI, verified community totals, premium analytics, partnerships portal, Play Internal Track, Tunnel/proper host when leaving local-device.

---

## Risks & Mitigations
- Postgres on phone impossible → SQLite phone + Postgres server, documented.
- LAN reachability (phone ↔ PC) → README LAN IP + `adb reverse` + tunnel fallback.
- Money errors → minor-units + tests.
- Secret leak (R2/Better Auth) → server env only, `.env.example`, no keys in app/repo.
- Scope creep → v1 gate: dual storage + budgeting only, no analytics/partnerships.

## Milestones
- M1 Slices 0–2 (design + ADRs + Compose up)
- M2 Slices 3–4 (engine tests + dual persistence + R2 presign)
- M3 Slice 5 usable loop + both storage badges
- M4 Slices 7–8 `v0.1.0` APK + local server docs

Next: `Docs/design-system.md` + `Docs/architecture/` stubs + `docker-compose.yml` + Better Auth scaffold.
