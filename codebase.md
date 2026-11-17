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
| `e2e/akses.spec.ts` | Phase 1 e2e: login per role and role nav, `?next=` redirect, no-access message, sign-up, logout, reset. Calls `POST /api/dev/reset` before each test |

## packages/domain (pure logic, shared)

| File | Purpose |
|---|---|
| `src/index.ts` | Package entry; exports `NAMA_APLIKASI` and re-exports `akses/` |
| `src/index.test.ts` | Placeholder unit test |
| `src/akses/index.ts` | Barrel for the `akses` module (must not import cuti/tiket) |
| `src/akses/peran.ts` | `Peran`, `DAFTAR_PERAN`, `LABEL_PERAN`, `punyaPeran` (Member also satisfies CalonPenumpang), `PESAN_TIDAK_ADA_AKSES` |
| `src/akses/peran.test.ts` | Unit tests for `punyaPeran` |
| `src/akses/pendaftaran.ts` | `validasiPendaftaran` (field -> Indonesian error), `PERAN_PENDAFTARAN` |
| `src/akses/pendaftaran.test.ts` | Unit tests for `validasiPendaftaran` |

## apps/api (Hono + SQLite/Drizzle)

| File | Purpose |
|---|---|
| `src/index.ts` | Server entry: `buatDb`, run migrations, seed if `akun` is empty, serve `buatApp(db)` on `PORT` (default 8787) |
| `src/app.ts` | `buatApp(db)`: Hono app under `/api`; health, `/auth`, demo guarded pings (`/cuti/ping`, `/tiket/saya/ping`), `POST /dev/reset` |
| `src/akses/rute.ts` | `/api/auth`: `daftar`, `masuk`, `keluar`, `saya` |
| `src/akses/sesi.ts` | Session cookie `sid` (httpOnly, Lax, 7 days) backed by the `sesi` table; `akunDariSesi`, `keAkunPublik` |
| `src/akses/middleware.ts` | `buatGuard(db)` -> `butuhLogin` (401) and `butuhPeran(...)` (403) |
| `src/akses/sandi.ts` | scrypt password hash + timing-safe compare (`node:crypto`) |
| `src/akses/akses.test.ts` | API tests via `app.request()` on an in-memory DB |
| `src/db/client.ts` | `buatDb(url)` factory over libsql (`:memory:` for tests; default `DATABASE_URL` or `file:data/cutiterbang.db`) |
| `src/db/schema.ts` | Drizzle tables: `akun`, `sesi` |
| `src/db/migrate.ts` | `jalankanMigrasi(db)`; migrations folder resolved relative to the package; also a CLI |
| `src/db/seed.ts` | `seed(db)` + `AKUN_DEMO`, `SANDI_DEMO`; idempotent (skips existing emails); also a CLI |
| `src/db/reset.ts` | `resetData(db)`: deletes `sesi` then `akun` rows in-process and reseeds; also the `db:reset` CLI |
| `drizzle/` | Generated SQL migrations (committed) |
| `drizzle.config.ts` | drizzle-kit config (SQLite, outputs to `drizzle/`) |

## apps/web (React + Vite + Tailwind)

| File | Purpose |
|---|---|
| `index.html` | HTML shell (`lang="id"`) |
| `vite.config.ts` | React + Tailwind plugins; proxies `/api` to port 8787 |
| `src/main.tsx` | React entry |
| `src/App.tsx` | `AuthProvider` + `RouterProvider` |
| `src/router.tsx` | `createBrowserRouter`: shell layout, `/`, `/masuk`, `/daftar`, and one guarded placeholder route per `MENU` item |
| `src/index.css` | Tailwind import |
| `src/akses/api.ts` | `panggil()` fetch helper returning status + JSON |
| `src/akses/AuthContext.tsx` | `AuthProvider` / `useAuth`: `akun`, `masuk`, `daftar`, `keluar`, `muatUlang` (loads `/api/auth/saya` on start) |
| `src/akses/Butuh.tsx` | Route guard `<Butuh peran>`: logged out -> `/masuk?next=`, wrong role -> `PESAN_TIDAK_ADA_AKSES` only |
| `src/akses/HalamanMasuk.tsx` | Login page with demo-accounts box |
| `src/akses/HalamanDaftar.tsx` | Sign-up page (client + API field errors) |
| `src/akses/komponen.tsx` | Form field wrapper and input/button class names |
| `src/shell/menu.ts` | `MENU`: single source of truth (route, label, roles, phase, US) + `menuUntuk(peran)` |
| `src/shell/Layout.tsx` | Header (brand, role-filtered nav, user, Keluar), footer "Reset data" |
| `src/halaman/Beranda.tsx` | Home: greeting + role menu cards, or links when logged out |
| `src/halaman/Placeholder.tsx` | "Belum dibuat — Fase N" page used until each phase builds its screen |
