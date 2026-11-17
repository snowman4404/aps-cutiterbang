# Codebase map

What each file does. Update this file whenever you add, move, rename or delete a file.

## Root

| File | Purpose |
|---|---|
| `package.json` | Workspace root; scripts for dev (both servers), test, `test:e2e` (default Playwright project), `test:visual` (screenshots), db |
| `vitest.config.ts` | Vitest: picks up `*.test.ts` in `packages/` and `apps/*/src/` |
| `playwright.config.ts` | Playwright: Chromium, serial (`workers: 1`, shared DB), starts API (8787) and web (5173); projects `chromium` (ignores `visual.spec.ts`) and `visual` (only `visual.spec.ts`) |
| `docs/spesifikasi.md` | Full assignment spec (use cases, domain model, diagrams) |
| `docs/roadmap.md` | Build phases, gap decisions per phase, progress checkboxes |
| `e2e/smoke.spec.ts` | Smoke test: page loads and reaches `/api/health` |
| `e2e/cuti.spec.ts` | Phase 2 e2e (US-1a/1b/1c + non-HRD access). Expected values computed from `buatDataCuti` + domain rules. Calls `POST /api/dev/reset` before each test |
| `e2e/penerbangan.spec.ts` | Phase 3 e2e (US-3, logged out): sorted results, cross-zone times, URL persistence, 3a/3b/3c rejections, 4a not found with inputs kept, G1 departed flight hidden, phone width. Expected values computed from `buatDataPenerbangan`. Calls `POST /api/dev/reset` before each test |
| `e2e/akses.spec.ts` | Phase 1 e2e: login per role and role nav, `?next=` redirect, no-access message, sign-up, logout, reset. Calls `POST /api/dev/reset` before each test |
| `e2e/tema.spec.ts` | Three-state theme toggle (Perangkat -> Terang -> Gelap -> Perangkat): `data-theme`, localStorage key and persistence after reload; Perangkat follows `prefers-color-scheme` |
| `e2e/visual.spec.ts` | Style-review screenshots to `.taste-skill/app-shots/` (gitignored); run with `npm run test:visual` (Playwright project `visual`) |
| `design/mockups/` | Static style mockups A/B/C; A (`clean.*`) is the chosen reference |

## packages/domain (pure logic, shared)

| File | Purpose |
|---|---|
| `src/index.ts` | Package entry; exports `NAMA_APLIKASI` and re-exports `umum/`, `akses/`, `cuti/` and `tiket/` |
| `src/index.test.ts` | Placeholder unit test |
| `src/akses/index.ts` | Barrel for the `akses` module (must not import cuti/tiket) |
| `src/akses/akun.ts` | `AkunPublik` (id, nama, email, peran): the public account shape shared by API and web |
| `src/akses/demo.ts` | Pure demo data: `SANDI_DEMO` and `AKUN_DEMO` (nama, email, peran); used by the API seed and the login page demo box |
| `src/akses/peran.ts` | `Peran`, `DAFTAR_PERAN`, `LABEL_PERAN`, `punyaPeran` (Member also satisfies CalonPenumpang), `PESAN_TIDAK_ADA_AKSES` |
| `src/akses/peran.test.ts` | Unit tests for `punyaPeran` |
| `src/akses/pendaftaran.ts` | `validasiPendaftaran` -> `{ ok: true, data }` (peran narrowed to `PeranPendaftaran`, nama/email trimmed) or `{ ok: false, galat }` (field -> Indonesian error); `PERAN_PENDAFTARAN`, `PeranPendaftaran` |
| `src/akses/pendaftaran.test.ts` | Unit tests for `validasiPendaftaran` |
| `src/umum/index.ts` | Barrel for module-neutral helpers shared by cuti and tiket (must not import any module) |
| `src/umum/tanggal.ts` | ISO `YYYY-MM-DD` date helpers in UTC (`adalahTanggalIso`, `tambahHari`, `hariDalamMinggu`, `tahunDari`, `hariIniWib`) and `pecahTanggalWaktu` (date + `HH:MM`) |
| `src/umum/tanggal.test.ts` | Unit tests for the shared date helpers |
| `src/cuti/index.ts` | Barrel for the `cuti` module (must not import tiket) |
| `src/cuti/kalenderKerja.ts` | `KalenderKerja`: `isHariKerja` (Mon-Fri minus `HariLibur`), `jumlahHariKerja` (inclusive) |
| `src/cuti/pengajuanCuti.ts` | `StatusPengajuanCuti`, `lamaCuti`, `beririsan`, `validasiPeriode`, sorting, `pengajuanPadaPeriode`, cuti messages |
| `src/cuti/pegawai.ts` | `cutiDisetujuiTahunIni`, `riwayatCuti`, `cutiTerpakai`, `sisaCuti` (G9: full to start year, may be negative) |
| `src/cuti/cuti.test.ts` | Unit tests for the cuti domain |
| `src/tiket/index.ts` | Barrel for the `tiket` module (must not import cuti) |
| `src/tiket/penerbangan.ts` | `ZonaWaktu`, `Kota` (with IANA `zonaWaktu`, G1), `Maskapai`, `Penerbangan`, `singkatanZona` (WIB/WITA/WIT), `instanDariWaktuLokal` / `waktuLokalDariInstan`, `waktuBerangkatAbsolut`, `sisaKursi` (count passed in), `tersedia`, invariants `memenuhiKotaBerbeda` / `memenuhiTidakOverbooking` |
| `src/tiket/pencarian.ts` | `IsianPencarian` / `IsianMentah` / `HasilPencarian`, `rapikanIsian`, `idKotaDariTeks`, `validasiIsianPencarian` (3a/3b/3c; 3b compares parsed kota ids), `cocok`, `urutkanMenurutWaktuBerangkat`, US-3 messages incl. `PESAN_PENERBANGAN_TIDAK_DITEMUKAN` |
| `src/tiket/tiket.test.ts` | Unit tests for the tiket domain (incl. the G1 Jayapura case, invariants, 3b `1` vs `01`) |

## apps/api (Hono + SQLite/Drizzle)

| File | Purpose |
|---|---|
| `src/index.ts` | Server entry: `buatDb`, run migrations, run the idempotent `seed`, serve `buatApp(db)` on `PORT` (default 8787) |
| `src/app.ts` | `buatApp(db, { hariIni?, sekarang?, lingkungan? })`: Hono app under `/api`; `GET /health` (incl. `resetAktif`), `/auth`, `/cuti`, `/penerbangan`, `POST /dev/reset` (404 in production unless `IZINKAN_RESET=1`; `resetDiizinkan(lingkungan)`) |
| `src/app.test.ts` | Tests the `POST /dev/reset` gate (production off, production + `IZINKAN_RESET=1` on, development on) and `resetAktif` in `/health` |
| `src/akses/rute.ts` | `/api/auth`: `daftar`, `masuk`, `keluar`, `saya` |
| `src/akses/sesi.ts` | Session cookie `sid` (httpOnly, Lax, 7 days) backed by the `sesi` table; `akunDariSesi`, `keAkunPublik` (returns the domain `AkunPublik`) |
| `src/akses/middleware.ts` | `buatGuard(db)` -> `butuhLogin` (401) and `butuhPeran(...)` (403) |
| `src/akses/sandi.ts` | scrypt password hash + timing-safe compare (`node:crypto`) |
| `src/akses/akses.test.ts` | API tests via `app.request()` on an in-memory DB; guard matrix (every demo account against every role guard on a test-only Hono app: 401/403/200), real cuti routes, public flight search |
| `src/cuti/rute.ts` | `/api/cuti` (HRDManajer only, read-only): `pengajuan?mulai&akhir`, `pegawai`, `pegawai/:nip/riwayat`, `pegawai/:nip/sisa` |
| `src/cuti/pengendaliCuti.ts` | Control `PengendaliCuti`: `tampilkanPengajuan`, `muatDaftarPegawai`, `tampilkanRiwayat`, `tampilkanSisaCuti` |
| `src/cuti/antarmukaDataKepegawaian.ts` | Boundary "Antarmuka Data Kepegawaian": DB queries for `pegawai`, `pengajuan_cuti`, `hari_libur` |
| `src/cuti/cuti.test.ts` | API tests: 401/403, validation 400s, overlap + sort, riwayat, sisa (negative), 404, seed idempotent |
| `src/tiket/rute.ts` | `/api/penerbangan` (public, no guard): `GET kota`, `GET cari?asal=<kotaId>&tujuan=<kotaId>&tanggal=` (400 `{ galat }` or 200 `{ penerbangan }`, empty = not found); passes one `IsianMentah` to the control |
| `src/tiket/pengendaliPencarian.ts` | Control `PengendaliPencarian`: `muatDaftarKota`, `validasiIsian` (domain checks + unknown kota, which wins over 3b), `cariPenerbangan(isian)` (`validasiIsian`, `cocok`, `urutkanMenurutWaktuBerangkat`, `keHasilPencarian`) |
| `src/tiket/antarmukaKatalogPenerbangan.ts` | Boundary: DB queries for `kota`, `maskapai`, `penerbangan`; `keHasilPencarian` result mapper; `jumlahPenumpangAktif(ids)` stub returning a map (all 0 until Phase 4 adds Pemesanan) |
| `src/tiket/tiket.test.ts` | API tests: kota list, 400s for 3a/3b (incl. `1` vs `01`)/3c/unknown kota, sort order, departed flight excluded, G1, cross-zone, empty list, seed/reset, rolling seed top-up, KotaBerbeda/TidakOverbooking (seed data and DB CHECK constraints) |
| `src/db/cli.ts` | `dijalankanLangsung(import.meta.url)`: true when a db module is run as a CLI (used by migrate, seed, reset) |
| `src/db/client.ts` | `buatDb(url)` factory over libsql (`:memory:` for tests; default `DATABASE_URL` or `file:data/cutiterbang.db`) |
| `src/db/schema.ts` | Drizzle tables: `akun`, `sesi`, `pegawai`, `pengajuan_cuti`, `hari_libur`, `kota`, `maskapai`, `penerbangan` (CHECK `asal_id <> tujuan_id`, `jumlah_kursi >= 0`; `kota.zonaWaktu` typed `ZonaWaktu`) |
| `src/db/migrate.ts` | `jalankanMigrasi(db)`; migrations folder resolved relative to the package; also a CLI |
| `src/db/seed.ts` | `seed(db, hariIni?)` seeding the domain `AKUN_DEMO` / `SANDI_DEMO`; idempotent (skips existing emails, holidays, pegawai, kota, maskapai); flights are a rolling top-up (today..today+30, `onConflictDoNothing` on nomor + tanggal, never deletes); also a CLI |
| `src/db/dataCuti.ts` | Pure cuti seed data `buatDataCuti(tahun)` + `NIP` (dates relative to the current year); shared with tests and e2e |
| `src/db/dataPenerbangan.ts` | Pure flight seed `buatDataPenerbangan(hariIni)` + `DEMO` (named demo routes) + `KOTA`/`MASKAPAI`: 8 cities, 4 made-up airlines, 31 days of flights (today..today+30); arrival times from the domain zone helpers; shared with tests and e2e |
| `src/db/reset.ts` | `resetData(db)`: discovers every Drizzle table exported by `schema.ts` (`tabelSkema`), deletes them in foreign-key-safe order (`urutanHapus`) in-process and reseeds, so new tables need no edit; also the `db:reset` CLI |
| `src/db/reset.test.ts` | Tests `resetData`: table discovery matches `sqlite_master`, delete order, a marker row in every table is gone after reset, idempotent |
| `drizzle/` | Generated SQL migrations (committed); `0002_*` adds `kota`, `maskapai`, `penerbangan`; `0003_*` adds the penerbangan CHECK constraints |
| `drizzle.config.ts` | drizzle-kit config (SQLite, outputs to `drizzle/`) |

## apps/web (React + Vite + Tailwind)

| File | Purpose |
|---|---|
| `index.html` | HTML shell (`lang="id"`); inline script applying the saved theme before first paint (no key = follow the device) |
| `vite.config.ts` | React + Tailwind plugins; proxies `/api` to port 8787 |
| `src/main.tsx` | React entry; imports the self-hosted `@fontsource` IBM Plex Sans (400/500/600) and Mono (400/500) |
| `src/App.tsx` | `AuthProvider` + `RouterProvider` |
| `src/router.tsx` | `createBrowserRouter`: shell layout, `/`, `/masuk`, `/daftar`, and one guarded route per `MENU` item (built page from `HALAMAN`, else placeholder) |
| `src/index.css` | Style-A tokens (light/dark, `:root` + `data-theme`), Tailwind `@theme` mapping (colours, radii, `desk` breakpoint 1101px, fonts), base styles, `.tabel` table styles |
| `src/lib/api.ts` | `panggil()` fetch helper returning status + JSON; module-neutral (akses, cuti, tiket, shell all use it) |
| `src/akses/AuthContext.tsx` | `AuthProvider` / `useAuth`: `akun` (domain `AkunPublik`), `masuk`, `daftar`, `keluar`, `muatUlang` (loads `/api/auth/saya` on start) |
| `src/akses/HanyaUntuk.tsx` | Route guard `<HanyaUntuk peran>`: logged out -> `/masuk?next=`, wrong role -> `PESAN_TIDAK_ADA_AKSES` only |
| `src/akses/HalamanMasuk.tsx` | Login page with demo-accounts box (accounts from the domain `AKUN_DEMO`, labels from `LABEL_PERAN`) |
| `src/akses/HalamanDaftar.tsx` | Sign-up page (client + API field errors) |
| `src/cuti/HalamanDaftarPengajuanCuti.tsx` | US-1a page: period form (client + API field errors), table with Pill status |
| `src/cuti/HalamanRiwayatCuti.tsx` | US-1b page: pegawai select (`?nip=`), history table or "Belum ada riwayat cuti" |
| `src/cuti/HalamanSisaCuti.tsx` | US-1c page: pegawai select (`?nip=`), sisa cuti card, "Melebihi jatah" pill when negative |
| `src/cuti/PilihPegawai.tsx` | Shared pegawai `Select` (nama + NIP) loaded from `/api/cuti/pegawai` |
| `src/cuti/format.ts` | `formatLama`, status -> Pill variant, `PegawaiRingkas` |
| `src/lib/tanggal.ts` | Module-neutral date formatting (id-ID): `formatTanggal` ("29 Des 2026"), `formatTanggalDenganHari` ("Sel, 29 Des 2026"); must not import any module |
| `src/tiket/HalamanCariPenerbangan.tsx` | US-3 page `/penerbangan` (public): form, field errors, flight cards, "Penerbangan tidak ditemukan" with inputs kept (display only; logic is in `useCariPenerbangan`) |
| `src/tiket/useCariPenerbangan.ts` | US-3 hook: loads kota, derives the search from URL `?asal=&tujuan=&tanggal=`, validates then fetches; boundary ops `tampilkanPesan`, `tandaiKolomSalah`, `tampilkanHasil` |
| `src/tiket/PilihKota.tsx` | Kota `Select` (label, placeholder, error) over a list loaded by the caller |
| `src/tiket/format.ts` | `formatHarga` (Rupiah), `formatWaktu` (time + WIB/WITA/WIT) |
| `src/shell/menu.ts` | `MENU`: single source of truth (route, grup, label, roles, `US-` code) + `peranTerbatas` / `bolehBuka` (the only readers of the "publik" sentinel) + `menuUntuk(akun)` + `kelompokMenu()` (group by `URUTAN_GRUP`) |
| `src/shell/Layout.tsx` | Frame only: grid of `Sidebar`, `BarAtas` and the white sheet holding the `Outlet` |
| `src/shell/Sidebar.tsx` | Sidebar (phone: full-screen menu): brand mark (ink, 4px radius), grouped nav, Reset data demo (only when the API reports `resetAktif`), `BarisPengguna` |
| `src/shell/BarAtas.tsx` | 48px top bar: phone menu toggle and page title, theme toggle, `TombolMasukDaftar` on desktop |
| `src/shell/BarisPengguna.tsx` | Avatar (round: the one radius exception), nama + peran (`data-testid="pengguna"`), Keluar |
| `src/shell/TombolMasukDaftar.tsx` | The logged-out Masuk / Daftar button pair (used by the top bar and the phone sidebar) |
| `src/shell/useMenuPonsel.ts` | Phone menu open state, scoped to the current route so navigating closes it |
| `src/shell/useResetDemo.ts` | Reads `resetAktif` from `/api/health`; `resetData()` calls `POST /dev/reset`, reloads the session and goes home |
| `src/halaman/Beranda.tsx` | Home: greeting + role menu as grouped rows (label + small grey US code), or intro + Masuk/Daftar + the public menu links when logged out |
| `src/halaman/Placeholder.tsx` | "Belum tersedia" page used for menu items without a screen yet (no mention of build phases) |
| `src/ui/index.ts` | Barrel for the UI kit |
| `src/ui/README.md` | UI kit components and house style rules |
| `src/ui/Button.tsx` | `Button`, `LinkTombol`, `kelasTombol` (primary/secondary/ghost/text/tautan; 32/38px; `ikon` size requires `aria-label`) |
| `src/ui/Field.tsx` | `Field` (label, error, aria wiring), `Input`, `Select` |
| `src/ui/PilihanRadio.tsx` | `PilihanRadio`: fieldset + legend radio group with error tied by `aria-describedby` |
| `src/ui/JudulBagian.tsx` | `JudulBagian`: in-page section heading (h2) |
| `src/ui/Memuat.tsx` | `Memuat`: grey loading line |
| `src/ui/Card.tsx` | `Card` (default/raised) |
| `src/ui/PageTitle.tsx` | h1 + optional finding line |
| `src/ui/Pill.tsx` | Status `Pill` (positive/accent/warning/neutral/negative), `kelasPill` |
| `src/ui/Chip.tsx` | Toggle chip (`aria-pressed`) |
| `src/ui/Kode.tsx` | Booking code in Plex Mono |
| `src/ui/Alert.tsx` | Negative/warning/neutral alert block |
| `src/ui/EmptyState.tsx` | One-sentence empty state |
| `src/ui/DataTable.tsx` | Table wrapper using `.tabel` styles |
| `src/ui/Ikon.tsx` | Inline 16px line icons (menu, tutup, bulan, matahari, layar, panah) |
| `src/ui/tema.tsx` | `usePilihanTema`, `TombolTema`: three states (Perangkat removes the `cutiterbang-tema` key and `data-theme`; Terang; Gelap), label "Tema: <state>" |
