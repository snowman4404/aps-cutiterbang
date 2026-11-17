# Codebase map

What each file does. Update this file whenever you add, move, rename or delete a file.

## Root

| File | Purpose |
|---|---|
| `package.json` | Workspace root; scripts for dev (both servers), test, e2e, db |
| `vitest.config.ts` | Vitest: picks up `*.test.ts` in `packages/` and `apps/*/src/` |
| `playwright.config.ts` | Playwright: Chromium only, serial, starts API (8787) and web (5173) |
| `docs/spesifikasi.md` | Full assignment spec (use cases, domain model, diagrams) |
| `docs/roadmap.md` | Build phases, gap decisions per phase, progress checkboxes |
| `e2e/smoke.spec.ts` | Smoke test: page loads and reaches `/api/health` |

## packages/domain (pure logic, shared)

| File | Purpose |
|---|---|
| `src/index.ts` | Package entry; exports `NAMA_APLIKASI` (placeholder until domain code exists) |
| `src/index.test.ts` | Placeholder unit test |

## apps/api (Hono + SQLite/Drizzle)

| File | Purpose |
|---|---|
| `src/index.ts` | Hono app under `/api`; `GET /api/health`; starts the server on `PORT` (default 8787) |
| `src/db/client.ts` | Drizzle client over libsql; `DATABASE_URL` or `file:data/cutiterbang.db` |
| `src/db/schema.ts` | Drizzle table definitions (empty so far) |
| `src/db/migrate.ts` | Applies migrations from `drizzle/` if present |
| `src/db/seed.ts` | Seed data for simulated systems and demo accounts (empty so far) |
| `src/db/reset.ts` | Deletes the DB file, then runs migrate and seed |
| `drizzle.config.ts` | drizzle-kit config (SQLite, outputs to `drizzle/`) |

## apps/web (React + Vite + Tailwind)

| File | Purpose |
|---|---|
| `index.html` | HTML shell (`lang="id"`) |
| `vite.config.ts` | React + Tailwind plugins; proxies `/api` to port 8787 |
| `src/main.tsx` | React entry |
| `src/App.tsx` | Placeholder page showing app name and API health |
| `src/index.css` | Tailwind import |
