# Codebase map

What each file does. Update this file whenever you add, move, rename or delete a file.

## Root

| File | Purpose |
|---|---|
| `package.json` | Workspace root; scripts for dev (both servers), test, e2e, db |
| `vitest.config.ts` | Vitest: picks up `*.test.ts` in `packages/` and `apps/*/src/` |
| `playwright.config.ts` | Playwright: Chromium only, serial (`workers: 1`, shared DB), starts API (8787) and web (5173) |
| `docs/spesifikasi.md` | Full assignment spec (use cases, domain model, diagrams) |
| `docs/roadmap.md` | Build phases, gap decisions per phase, progress checkboxes |
| `e2e/smoke.spec.ts` | Smoke test: page loads and reaches `/api/health` |
| `e2e/cuti.spec.ts` | Phase 2 e2e (US-1a/1b/1c + non-HRD access). Expected values computed from `buatDataCuti` + domain rules. Calls `POST /api/dev/reset` before each test |
| `e2e/penerbangan.spec.ts` | Phase 3 e2e (US-3, logged out): sorted results, cross-zone times, URL persistence, 3a/3b/3c rejections, 4a not found with inputs kept, G1 departed flight hidden, phone width. Expected values computed from `buatDataPenerbangan`. Calls `POST /api/dev/reset` before each test |
| `e2e/akses.spec.ts` | Phase 1 e2e: login per role and role nav, `?next=` redirect, no-access message, sign-up, logout, reset. Calls `POST /api/dev/reset` before each test |
| `e2e/tema.spec.ts` | Theme toggle sets `data-theme` on `<html>` and persists after reload |
| `e2e/visual.spec.ts` | Style-review screenshots to `.taste-skill/app-shots/` (gitignored); skipped unless `VISUAL=1` (`VISUAL=1 npx playwright test e2e/visual.spec.ts`) |
| `design/mockups/` | Static style mockups A/B/C; A (`clean.*`) is the chosen reference |

## packages/domain (pure logic, shared)

| File | Purpose |
|---|---|
| `src/index.ts` | Package entry; exports `NAMA_APLIKASI` and re-exports `akses/`, `cuti/` and `tiket/` |
| `src/index.test.ts` | Placeholder unit test |
| `src/akses/index.ts` | Barrel for the `akses` module (must not import cuti/tiket) |
| `src/akses/peran.ts` | `Peran`, `DAFTAR_PERAN`, `LABEL_PERAN`, `punyaPeran` (Member also satisfies CalonPenumpang), `PESAN_TIDAK_ADA_AKSES` |
| `src/akses/peran.test.ts` | Unit tests for `punyaPeran` |
| `src/akses/pendaftaran.ts` | `validasiPendaftaran` (field -> Indonesian error), `PERAN_PENDAFTARAN` |
| `src/akses/pendaftaran.test.ts` | Unit tests for `validasiPendaftaran` |
| `src/cuti/index.ts` | Barrel for the `cuti` module (must not import tiket) |
| `src/cuti/tanggal.ts` | ISO `YYYY-MM-DD` date helpers in UTC (`adalahTanggalIso`, `tambahHari`, `hariDalamMinggu`, `tahunDari`, `hariIniWib`) |
| `src/cuti/kalenderKerja.ts` | `KalenderKerja`: `isHariKerja` (Mon-Fri minus `HariLibur`), `jumlahHariKerja` (inclusive) |
| `src/cuti/pengajuanCuti.ts` | `StatusPengajuanCuti`, `lamaCuti`, `beririsan`, `validasiPeriode`, sorting, `pengajuanPadaPeriode`, cuti messages |
| `src/cuti/pegawai.ts` | `cutiDisetujuiTahunIni`, `riwayatCuti`, `cutiTerpakai`, `sisaCuti` (G9: full to start year, may be negative) |
| `src/cuti/cuti.test.ts` | Unit tests for the cuti domain |
| `src/tiket/index.ts` | Barrel for the `tiket` module (must not import cuti; `tanggal.ts` is deliberately not re-exported) |
| `src/tiket/tanggal.ts` | Private copy of small date/time parsing helpers (`adalahTanggalValid`, `pecahTanggalWaktu`) so tiket does not import cuti |
| `src/tiket/penerbangan.ts` | `Kota` (with IANA `zonaWaktu`, G1), `Maskapai`, `Penerbangan`, `singkatanZona` (WIB/WITA/WIT), `instanDariWaktuLokal`, `waktuBerangkatAbsolut`, `sisaKursi` (count passed in), `tersedia` |
| `src/tiket/pencarian.ts` | `validasiIsianPencarian` (3a/3b/3c), `cocok`, `urutkanMenurutWaktuBerangkat`, US-3 messages incl. `PESAN_PENERBANGAN_TIDAK_DITEMUKAN` |
| `src/tiket/tiket.test.ts` | Unit tests for the tiket domain (incl. the G1 Jayapura case) |

## apps/api (Hono + SQLite/Drizzle)

| File | Purpose |
|---|---|
| `src/index.ts` | Server entry: `buatDb`, run migrations, run the idempotent `seed`, serve `buatApp(db)` on `PORT` (default 8787) |
| `src/app.ts` | `buatApp(db, { hariIni?, sekarang? })`: Hono app under `/api`; health, `/auth`, `/cuti`, `/penerbangan`, demo guarded ping (`/tiket/saya/ping`), `POST /dev/reset` |
| `src/akses/rute.ts` | `/api/auth`: `daftar`, `masuk`, `keluar`, `saya` |
| `src/akses/sesi.ts` | Session cookie `sid` (httpOnly, Lax, 7 days) backed by the `sesi` table; `akunDariSesi`, `keAkunPublik` |
| `src/akses/middleware.ts` | `buatGuard(db)` -> `butuhLogin` (401) and `butuhPeran(...)` (403) |
| `src/akses/sandi.ts` | scrypt password hash + timing-safe compare (`node:crypto`) |
| `src/akses/akses.test.ts` | API tests via `app.request()` on an in-memory DB |
| `src/cuti/rute.ts` | `/api/cuti` (HRDManajer only, read-only): `pengajuan?mulai&akhir`, `pegawai`, `pegawai/:nip/riwayat`, `pegawai/:nip/sisa` |
| `src/cuti/pengendaliCuti.ts` | Control `PengendaliCuti`: `tampilkanPengajuan`, `muatDaftarPegawai`, `tampilkanRiwayat`, `tampilkanSisaCuti` |
| `src/cuti/antarmukaDataKepegawaian.ts` | Boundary "Antarmuka Data Kepegawaian": DB queries for `pegawai`, `pengajuan_cuti`, `hari_libur` |
| `src/cuti/cuti.test.ts` | API tests: 401/403, validation 400s, overlap + sort, riwayat, sisa (negative), 404, seed idempotent |
| `src/tiket/rute.ts` | `/api/penerbangan` (public, no guard): `GET kota`, `GET cari?asal=<kotaId>&tujuan=<kotaId>&tanggal=` (400 `{ galat }` or 200 `{ penerbangan }`, empty = not found) |
| `src/tiket/pengendaliPencarian.ts` | Control `PengendaliPencarian`: `muatDaftarKota`, `cariPenerbangan` (validate, unknown kota check, `cocok`, sort) |
| `src/tiket/antarmukaKatalogPenerbangan.ts` | Boundary: DB queries for `kota`, `maskapai`, `penerbangan`; `jumlahPenumpangAktif` stub (always 0 until Phase 4 adds Pemesanan) |
| `src/tiket/tiket.test.ts` | API tests: kota list, 400s for 3a/3b/3c/unknown kota, sort order, departed flight excluded, G1, cross-zone, empty list, seed/reset |
| `src/db/client.ts` | `buatDb(url)` factory over libsql (`:memory:` for tests; default `DATABASE_URL` or `file:data/cutiterbang.db`) |
| `src/db/schema.ts` | Drizzle tables: `akun`, `sesi`, `pegawai`, `pengajuan_cuti`, `hari_libur`, `kota`, `maskapai`, `penerbangan` |
| `src/db/migrate.ts` | `jalankanMigrasi(db)`; migrations folder resolved relative to the package; also a CLI |
| `src/db/seed.ts` | `seed(db, hariIni?)` + `AKUN_DEMO`, `SANDI_DEMO`; idempotent (skips existing emails, holidays, pegawai, kota, maskapai, and penerbangan once any exist); also a CLI |
| `src/db/dataCuti.ts` | Pure cuti seed data `buatDataCuti(tahun)` + `NIP` (dates relative to the current year); shared with tests and e2e |
| `src/db/dataPenerbangan.ts` | Pure flight seed `buatDataPenerbangan(hariIni)` + `DEMO` (named demo routes) + `KOTA`/`MASKAPAI`: 8 cities, 4 made-up airlines, 30 days of flights; shared with tests and e2e |
| `src/db/reset.ts` | `resetData(db)`: deletes `sesi`, `akun`, `pengajuan_cuti`, `pegawai`, `hari_libur`, `penerbangan`, `maskapai`, `kota` rows in-process and reseeds; also the `db:reset` CLI |
| `drizzle/` | Generated SQL migrations (committed); `0002_*` adds `kota`, `maskapai`, `penerbangan` |
| `drizzle.config.ts` | drizzle-kit config (SQLite, outputs to `drizzle/`) |

## apps/web (React + Vite + Tailwind)

| File | Purpose |
|---|---|
| `index.html` | HTML shell (`lang="id"`); IBM Plex Sans/Mono links; inline script applying the saved theme before first paint |
| `vite.config.ts` | React + Tailwind plugins; proxies `/api` to port 8787 |
| `src/main.tsx` | React entry |
| `src/App.tsx` | `AuthProvider` + `RouterProvider` |
| `src/router.tsx` | `createBrowserRouter`: shell layout, `/`, `/masuk`, `/daftar`, and one guarded route per `MENU` item (built page from `HALAMAN`, else placeholder) |
| `src/index.css` | Style-A tokens (light/dark, `:root` + `data-theme`), Tailwind `@theme` mapping (colours, radii, `desk` breakpoint 1101px, fonts), base styles, `.tabel` table styles |
| `src/akses/api.ts` | `panggil()` fetch helper returning status + JSON |
| `src/akses/AuthContext.tsx` | `AuthProvider` / `useAuth`: `akun`, `masuk`, `daftar`, `keluar`, `muatUlang` (loads `/api/auth/saya` on start) |
| `src/akses/Butuh.tsx` | Route guard `<Butuh peran>`: logged out -> `/masuk?next=`, wrong role -> `PESAN_TIDAK_ADA_AKSES` only |
| `src/akses/HalamanMasuk.tsx` | Login page with demo-accounts box |
| `src/akses/HalamanDaftar.tsx` | Sign-up page (client + API field errors) |
| `src/cuti/HalamanDaftarPengajuanCuti.tsx` | US-1a page: period form (client + API field errors), table with Pill status |
| `src/cuti/HalamanRiwayatCuti.tsx` | US-1b page: pegawai select (`?nip=`), history table or "Belum ada riwayat cuti" |
| `src/cuti/HalamanSisaCuti.tsx` | US-1c page: pegawai select (`?nip=`), sisa cuti card, "Melebihi jatah" pill when negative |
| `src/cuti/PilihPegawai.tsx` | Shared pegawai `Select` (nama + NIP) loaded from `/api/cuti/pegawai` |
| `src/cuti/format.ts` | `formatTanggal` (id-ID, "29 Des 2026"), `formatLama`, status -> Pill variant |
| `src/tiket/HalamanCariPenerbangan.tsx` | US-3 page `/penerbangan` (public): asal/tujuan selects + date, client + API field errors, search kept in URL `?asal=&tujuan=&tanggal=`, flight cards, "Penerbangan tidak ditemukan" with inputs kept |
| `src/tiket/format.ts` | `formatTanggal`, `formatHarga` (Rupiah), `formatWaktu` (time + WIB/WITA/WIT), `KotaPilihan`, `HasilPenerbangan` types |
| `src/shell/menu.ts` | `MENU`: single source of truth (route, grup, label, roles, phase, US) + `menuUntuk(peran)` + `kelompokMenu()` (group by `URUTAN_GRUP`) |
| `src/shell/Layout.tsx` | Tinted L-frame: sidebar (brand, grouped nav, Reset data demo, user row + Keluar), 48px top bar (theme toggle, Masuk/Daftar), white sheet; phone: sticky 56px bar + full-screen menu sheet |
| `src/halaman/Beranda.tsx` | Home: greeting + role menu as grouped rows, or intro + Masuk/Daftar when logged out |
| `src/halaman/Placeholder.tsx` | "Belum dibuat — Fase N" page used until each phase builds its screen |
| `src/ui/index.ts` | Barrel for the UI kit |
| `src/ui/README.md` | UI kit components and house style rules |
| `src/ui/Button.tsx` | `Button`, `LinkTombol`, `kelasTombol` (primary/secondary/ghost, 32/38px) |
| `src/ui/Field.tsx` | `Field` (label, error, aria wiring), `Input`, `Select` |
| `src/ui/Card.tsx` | `Card` (default/raised) |
| `src/ui/PageTitle.tsx` | h1 + optional finding line |
| `src/ui/Pill.tsx` | Status `Pill` (positive/accent/warning/neutral/negative), `kelasPill` |
| `src/ui/Chip.tsx` | Toggle chip (`aria-pressed`) |
| `src/ui/Kode.tsx` | Booking code in Plex Mono |
| `src/ui/Alert.tsx` | Negative/warning/neutral alert block |
| `src/ui/EmptyState.tsx` | One-sentence empty state |
| `src/ui/DataTable.tsx` | Table wrapper using `.tabel` styles |
| `src/ui/Ikon.tsx` | Inline 16px line icons |
| `src/ui/tema.tsx` | `useGelap`, `TombolTema` (stores `cutiterbang-tema` in localStorage) |
