# Codebase map

What each file does. Update this file whenever you add, move, rename or delete a file.

## Root

| File | Purpose |
|---|---|
| `package.json` | Workspace root; scripts for dev (both servers), test, e2e, db |
| `vitest.config.ts` | Vitest: picks up `*.test.ts` in `packages/` and `apps/*/src/`; 30 s test / 60 s hook timeouts (API tests seed ~1,500 flights and hash with scrypt per test) |
| `playwright.config.ts` | Playwright: Chromium only, serial (`workers: 1`, shared DB), starts API (8787) and web (5173) |
| `docs/spesifikasi.md` | Full assignment spec (use cases, domain model, diagrams) |
| `docs/roadmap.md` | Build phases, gap decisions per phase, progress checkboxes |
| `e2e/smoke.spec.ts` | Smoke test: page loads and reaches `/api/health` |
| `e2e/cuti.spec.ts` | Phase 2 e2e (US-1a/1b/1c + non-HRD access). Expected values computed from `buatDataCuti` + domain rules. Calls `POST /api/dev/reset` before each test |
| `e2e/penerbangan.spec.ts` | Phase 3 e2e (US-3, logged out): sorted results, cross-zone times, URL persistence, 3a/3b/3c rejections, 4a not found with inputs kept, G1 departed flight hidden, phone width. Expected values computed from `buatDataPenerbangan`. Calls `POST /api/dev/reset` before each test |
| `e2e/pemesanan.spec.ts` | Phase 4 e2e (US-2a/2b): logged-out Pesan -> login -> form -> ringkasan -> Tiket Saya, seat count -1 in search, 7a field errors, 7b last seat taken meanwhile, sold-out flight shows the form and fails only at Konfirmasi, unknown flight page, "Pesan" button only for logged-out/penumpang (not HRD/Manajer Travel/Pengunjung), token layout checks (180px column, dialog 343px at 375px), HRD no access, Member can book, cancel with Tidak/Ya/Esc, empty Tiket Saya, phone width. Expected values from `buatDataPenerbangan` + `buatDataPemesanan`. Calls `POST /api/dev/reset` before each test |
| `e2e/akses.spec.ts` | Phase 1 e2e: login per role and role nav, `?next=` redirect, no-access message, sign-up, logout, reset. Calls `POST /api/dev/reset` before each test |
| `e2e/tema.spec.ts` | Theme toggle sets `data-theme` on `<html>` and persists after reload |
| `e2e/visual.spec.ts` | Style-review screenshots to `.taste-skill/app-shots/` (gitignored); skipped unless `VISUAL=1` (`VISUAL=1 npx playwright test e2e/visual.spec.ts`) |
| `design/mockups/` | Static style mockups A/B/C; A (`clean.*`) is the chosen reference |

## packages/domain (pure logic, shared)

| File | Purpose |
|---|---|
| `src/index.ts` | Package entry; exports `NAMA_APLIKASI` and re-exports `umum/`, `akses/`, `cuti/` and `tiket/` |
| `src/index.test.ts` | Placeholder unit test |
| `src/akses/index.ts` | Barrel for the `akses` module (must not import cuti/tiket) |
| `src/akses/peran.ts` | `Peran`, `DAFTAR_PERAN`, `LABEL_PERAN`, `punyaPeran` (Member also satisfies CalonPenumpang), `PESAN_TIDAK_ADA_AKSES` |
| `src/akses/peran.test.ts` | Unit tests for `punyaPeran` |
| `src/akses/pendaftaran.ts` | `validasiPendaftaran` (field -> Indonesian error), `PERAN_PENDAFTARAN` |
| `src/akses/pendaftaran.test.ts` | Unit tests for `validasiPendaftaran` |
| `src/umum/index.ts` | Barrel for module-neutral helpers shared by cuti and tiket (must not import any module) |
| `src/umum/tanggal.ts` | ISO `YYYY-MM-DD` date helpers in UTC (`adalahTanggalIso`, `tambahHari`, `hariDalamMinggu`, `tahunDari`, `hariIniWib`) and `pecahTanggalWaktu` (date + `HH:MM`) |
| `src/umum/tanggal.test.ts` | Unit tests for the shared date helpers |
| `src/cuti/index.ts` | Barrel for the `cuti` module (must not import tiket) |
| `src/cuti/kalenderKerja.ts` | `KalenderKerja`: `isHariKerja` (Mon-Fri minus `HariLibur`), `jumlahHariKerja` (inclusive) |
| `src/cuti/pengajuanCuti.ts` | `DAFTAR_STATUS_PENGAJUAN` (as const, single source; `StatusPengajuanCuti` derived), `Periode`, `lamaCuti`, `beririsan(p, periode)`, `validasiPeriode` (raw input -> `{ periode }` or `{ galat }`), sorting, `pengajuanPadaPeriode(daftar, periode)`, cuti messages |
| `src/cuti/pegawai.ts` | `Pegawai`, `PegawaiRingkas` (nama + NIP, shared by API and web), `cutiDisetujuiTahunIni`, `riwayatCuti`, `cutiTerpakai`, `sisaCuti` (G9: full to start year, may be negative) |
| `src/cuti/cuti.test.ts` | Unit tests for the cuti domain |
| `src/tiket/index.ts` | Barrel for the `tiket` module (must not import cuti); also exports `pemesanan`, `kodeBooking`, `dataWajib`, `alokasiKursi` |
| `src/tiket/penerbangan.ts` | `ZonaWaktu`, `Kota` (with IANA `zonaWaktu`, G1), `Maskapai`, `Penerbangan`, `singkatanZona` (WIB/WITA/WIT), `instanDariWaktuLokal` / `waktuLokalDariInstan`, `waktuBerangkatAbsolut`, `sisaKursi` (count passed in), `tersedia`, invariants `memenuhiKotaBerbeda` / `memenuhiTidakOverbooking` (full protection = `AlokasiKursi`) |
| `src/tiket/pencarian.ts` | `IsianPencarian` / `IsianMentah` / `HasilPencarian`, `rapikanIsian`, `idKotaDariTeks`, `validasiIsianPencarian` (3a/3b/3c; 3b compares parsed kota ids), `cocok`, `urutkanMenurutWaktuBerangkat`, US-3 messages incl. `PESAN_PENERBANGAN_TIDAK_DITEMUKAN` |
| `src/tiket/tiket.test.ts` | Unit tests for the tiket domain (incl. the G1 Jayapura case, invariants, 3b `1` vs `01`) |
| `src/tiket/pemesanan.ts` | `StatusBooking` (`DAFTAR_STATUS_BOOKING`, `LABEL_STATUS_BOOKING`, `STATUS_AWAL_BOOKING`, `STATUS_DIBATALKAN`), state machine `transisi(status, pemicu)` (5 legal transitions, `Cancelled` final, G5 Confirmed -> Cancelled), `STATUS_DAPAT_DIBATALKAN` (derived from `transisi`), `dapatDibatalkan` / `dapatDibatalkanPada` (cancel guard = `transisi(status, 'batalkan') !== null` and departure instant > now), `InformasiPenerbangan`, `TiketSaya`, spec messages `PESAN_KODE_TIDAK_DITEMUKAN` / `PESAN_TIDAK_DAPAT_DIBATALKAN`, invariants `memenuhiDataPenumpangLengkap` / `memenuhiPesananSendiri` (OCL DataPenumpangLengkap, PesananSendiri) |
| `src/tiket/kodeBooking.ts` | `KodeBookingReference`: `normalKode` (trim + lowercase), `samaKode`, `buatKodeBooking(acak?)` (6 chars from an alphabet without I/O/0/1) |
| `src/tiket/dataWajib.ts` | `DataWajib` value object, `formatValid` / `lengkap` (OCL), `validasiDataPenumpang(mentah, hariIni)` -> `{ data }` or per-field `{ galat }`; one message per field = the spec's "Variasi teknologi dan data" phrase for both empty and invalid (`PESAN_NAMA_LENGKAP` ... `PESAN_EMAIL`), plus `PESAN_DATA_PENUMPANG_TIDAK_LENGKAP` (ext 7a); reused by Phase 5 Profil |
| `src/tiket/alokasiKursi.ts` | `bolehAlokasi(jumlahKursi, terpakai, jumlah)` (the seat rule: used by `konfirmasi`'s 7b shortcut; `antarmukaPemesanan.alokasiKursi` is its atomic SQL implementation, tied by an API test), `PESAN_KURSI_HABIS` ("Kursi sudah habis") |
| `src/tiket/pemesanan.test.ts` | Unit tests: state-machine table incl. illegal transitions, `dapatDibatalkan` at the departure boundary (Jayapura), kode normalisation, `DataWajib` boundaries (100/101 chars, 15/16/17 digits, 9/10/13/14 digits, birth date = today), `bolehAlokasi`, the spec wording of every user-facing message, `STATUS_DAPAT_DIBATALKAN`, invariants DataPenumpangLengkap / PesananSendiri |

## apps/api (Hono + SQLite/Drizzle)

| File | Purpose |
|---|---|
| `src/index.ts` | Server entry: `buatDb`, run migrations, run the idempotent `seed`, serve `buatApp(db)` on `PORT` (default 8787) |
| `src/app.ts` | `buatApp(db, { hariIni?, sekarang? })`: Hono app under `/api`; health, `/auth`, `/cuti`, `/penerbangan`, `/pemesanan`, `POST /dev/reset` |
| `src/akses/rute.ts` | `/api/auth`: `daftar`, `masuk`, `keluar`, `saya` |
| `src/akses/sesi.ts` | Session cookie `sid` (httpOnly, Lax, 7 days) backed by the `sesi` table; `akunDariSesi`, `keAkunPublik` |
| `src/akses/middleware.ts` | `buatGuard(db)` -> `butuhLogin` (401) and `butuhPeran(...)` (403) |
| `src/akses/sandi.ts` | scrypt password hash + timing-safe compare (`node:crypto`) |
| `src/akses/akses.test.ts` | API tests via `app.request()` on an in-memory DB (guard tests hit `GET /api/pemesanan/saya`) |
| `src/cuti/rute.ts` | `/api/cuti` (HRDManajer only via `butuhLogin` + a middleware calling `PengendaliCuti.periksaPeran`; 401/403 as `butuhPeran`; read-only): `pengajuan?mulai&akhir`, `pegawai`, `pegawai/:nip/riwayat`, `pegawai/:nip/sisa` |
| `src/cuti/pengendaliCuti.ts` | Control `PengendaliCuti`: `periksaPeran`, `tampilkanPengajuan`, `muatDaftarPegawai`, `tampilkanRiwayat` (with row `id`), `tampilkanSisaCuti`. Applies all cuti rules via domain (`pengajuanPadaPeriode`, `cutiDisetujuiTahunIni`, `riwayatCuti`, `sisaCuti`, `cutiTerpakai`); internal `ambilPengajuanBeririsan` / `ambilJatahDanCutiDisetujui` |
| `src/cuti/antarmukaDataKepegawaian.ts` | Boundary "Antarmuka Data Kepegawaian": raw-row DB queries only (`ambilDaftarPegawai`, `cariPegawai`, `ambilHariLibur`, `ambilSemuaPengajuan`, `ambilPengajuanPegawai`); no cuti rules in SQL |
| `src/cuti/cuti.test.ts` | API tests: 401/403, validation 400s, overlap + sort, riwayat (unique ids), sisa (negative), 404, `periksaPeran`, seed idempotent and year rollover, holiday coverage of every seeded year |
| `src/tiket/rute.ts` | `/api/penerbangan` (public, no guard): `GET kota`, `GET cari?asal=<kotaId>&tujuan=<kotaId>&tanggal=` (400 `{ galat }` or 200 `{ penerbangan }`, empty = not found), `GET :id` (US-2a ringkasan via `PengendaliPemesanan.siapkanRingkasan`: `{ penerbangan }` with `sisaKursi` + `tersedia`, 404 if unknown); passes the query as one `IsianMentah` to `PengendaliPencarian` |
| `src/tiket/pengendaliPencarian.ts` | Control `PengendaliPencarian`: `muatDaftarKota`, `validasiIsian` (domain checks + unknown kota, which wins over 3b), `cariPenerbangan(isian)` (`validasiIsian`, `cocok`, `urutkanMenurutWaktuBerangkat`, `keHasilPencarian`) |
| `src/tiket/antarmukaKatalogPenerbangan.ts` | Boundary: DB queries for `kota`, `maskapai`, `penerbangan` (`ambilPenerbangan`, `ambilPenerbanganUntuk`); `keHasilPencarian` result mapper; `jumlahPenumpangAktif(ids)` = one aggregate query over `alokasi_kursi` (sum per flight) |
| `src/tiket/rutePemesanan.ts` | `/api/pemesanan` (`butuhLogin` + `butuhPeran('CalonPenumpang')`, Member passes): `POST /` (US-2a: 201 `{ pemesanan }`, 400 `{ galat }`, 409 "Kursi sudah habis", 404 unknown flight), `GET /saya` (Tiket Saya), `POST /:kode/batalkan` (US-2b: 200; 404 "Kode booking reference tidak ditemukan" for an unknown code and for someone else's booking; 409 "Pemesanan berstatus Cancelled atau waktu berangkatnya sudah lewat") |
| `src/tiket/antarmukaPemesanan.ts` | Boundary Pemesanan/Penumpang/AlokasiKursi: `alokasiKursi(baru, jumlah)` (one `db.batch`: conditional `INSERT ... SELECT ... WHERE jumlah > 0 AND sisa >= jumlah` into `alokasi_kursi` = the atomic SQL form of domain `bolehAlokasi`, then Pemesanan and Penumpang guarded by `WHERE EXISTS` on the allocation; no overbooking under concurrency), `batalkan(kode)` (status -> Cancelled for the statuses in `STATUS_DAPAT_DIBATALKAN` and delete allocation in one batch); statuses are bound from the domain, not hard-coded in SQL; `cariDenganKode` (normalised), `tiketSaya(akunId)` (pemesan or `mewakili`), `adalahKodeBentrok` |
| `src/tiket/pengendaliPemesanan.ts` | Control `PengendaliPemesanan` (US-2a, C1): `informasiPenerbangan`, `siapkanRingkasan`, `validasiDataPenumpang`, `buatKodeUnik` (one random code, null when already used), `konfirmasi(akun, idPenerbangan, data)` (validate -> 7b shortcut with domain `bolehAlokasi` -> fresh `sekarang()` departed check -> allocate -> create; the single retry loop covers used codes and UNIQUE races, then throws `GALAT_KODE_TIDAK_UNIK`) |
| `src/tiket/pengendaliPembatalan.ts` | Control `PengendaliPembatalan` (US-2b, C3): `tentukanPemesananDapatDibatalkan(akun)`, `batalkan(akun, kode)` (G4: someone else's kode = `tidakDitemukan`; Cancelled or departed = `tidakBisa`, checked with a fresh `sekarang()` just before `data.batalkan`) |
| `src/tiket/tiketSaya.ts` | Shared mapper for both controllers: `keInformasiPenerbangan` (info + `/tersedia`) and `muatTiketSaya` (Pemesanan rows -> `TiketSaya`, `dapatDibatalkan` only for the pemesan) |
| `src/tiket/pemesanan.test.ts` | API tests: 401/403 per role, 400 per field with spec wording, success (WFP, unique kode, copy of data, `mewakili`), seat count -1, Tiket Saya = ringkasan, last-seat race (concurrent bookings), sold-out, departed 409, cancel (seat back, reappears, twice 409, someone else's = 404 like an unknown code, departed 409, Booked/Confirmed allowed, kode case/space-insensitive, concurrent cancels), UNIQUE kode + batch rollback, `buatKodeUnik` / single retry loop, SQL `alokasiKursi` accepts exactly when `bolehAlokasi` does, invariants DataPenumpangLengkap + PesananSendiri over all Pemesanan, `SUM(alokasi_kursi)` = non-Cancelled penumpang per flight, Penumpang CHECK/NOT NULL constraints, seed idempotent and reset |
| `src/tiket/tiket.test.ts` | API tests: kota list, 400s for 3a/3b (incl. `1` vs `01`)/3c/unknown kota, sort order, departed flight excluded, G1, cross-zone, empty list, seed/reset, rolling seed top-up, KotaBerbeda/TidakOverbooking (seed data and DB CHECK constraints) |
| `src/db/client.ts` | `buatDb(url)` factory over libsql (`:memory:` for tests; default `DATABASE_URL` or `file:data/cutiterbang.db`) |
| `src/db/schema.ts` | Drizzle tables: `akun`, `sesi`, `pegawai`, `pengajuan_cuti`, `hari_libur`, `kota`, `maskapai`, `penerbangan` (CHECK `asal_id <> tujuan_id`, `jumlah_kursi >= 0`; `kota.zonaWaktu` typed `ZonaWaktu`), `pemesanan` (`kode_normal` UNIQUE = KodeUnik, status CHECK in the 4 values), `penumpang` (cascade on pemesanan, `akun_id` NOT NULL = `mewakili`, DataWajib copy with non-empty CHECKs), `alokasi_kursi` (UNIQUE `kode_normal`, CHECK `jumlah > 0`) |
| `src/db/migrate.ts` | `jalankanMigrasi(db)`; migrations folder resolved relative to the package; also a CLI |
| `src/db/seed.ts` | `seed(db, hariIni?)` + `AKUN_DEMO`, `SANDI_DEMO`; idempotent (skips existing emails, holidays, pegawai, kota, maskapai); `pengajuan_cuti` is replaced (one `db.batch`) when the stored set is not the current year's `buatDataCuti` set (year rollover), unchanged otherwise; flights are a rolling top-up (today..today+30, `onConflictDoNothing` on nomor + tanggal, never deletes); demo Pemesanan (`buatDataPemesanan`) inserted once per fixed kode normal (one batch with Penumpang and, unless Cancelled, AlokasiKursi), never overwritten; also a CLI |
| `src/db/dataCuti.ts` | Pure cuti seed data `buatDataCuti(tahun)` + `NIP` (dates relative to the current year; holidays cover every year touched by any seeded leave); shared with tests and e2e |
| `src/db/dataPenerbangan.ts` | Pure flight seed `buatDataPenerbangan(hariIni)` + `DEMO` (named demo routes) + `KOTA`/`MASKAPAI`: 8 cities, 4 made-up airlines, 31 days of flights (today..today+30); arrival times from the domain zone helpers; shared with tests and e2e |
| `src/db/dataPemesanan.ts` | Pure demo bookings `buatDataPemesanan(hariIni)`: CTB001 (penumpang, WaitingForThePayment), CTB002 (penumpang, Cancelled), CTB003 (member1, Booked), CTB004 (member2, Booked, takes the only seat of the sold-out flight); no Confirmed (ETiket is Phase 6) |
| `src/db/reset.ts` | `resetData(db)`: deletes `alokasi_kursi`, `penumpang`, `pemesanan`, `sesi`, `akun`, `pengajuan_cuti`, `pegawai`, `hari_libur`, `penerbangan`, `maskapai`, `kota` rows in one atomic `db.batch` (FK order) then reseeds; also the `db:reset` CLI |
| `drizzle/` | Generated SQL migrations (committed); `0002_*` adds `kota`, `maskapai`, `penerbangan`; `0003_*` adds the penerbangan CHECK constraints; `0004_*` adds `pemesanan`, `penumpang`, `alokasi_kursi`; `0005_public_exiles` makes `penumpang.akun_id` NOT NULL and adds CHECKs that the five DataWajib columns are non-empty |
| `drizzle.config.ts` | drizzle-kit config (SQLite, outputs to `drizzle/`) |

## apps/web (React + Vite + Tailwind)

| File | Purpose |
|---|---|
| `index.html` | HTML shell (`lang="id"`); IBM Plex Sans/Mono links; inline script applying the saved theme before first paint |
| `vite.config.ts` | React + Tailwind plugins; proxies `/api` to port 8787 |
| `src/main.tsx` | React entry |
| `src/App.tsx` | `AuthProvider` + `RouterProvider` |
| `src/router.tsx` | `createBrowserRouter`: shell layout, `/`, `/masuk`, `/daftar`, and one guarded route per `MENU` item (built page from `HALAMAN`, else placeholder), plus `/pesan/:idPenerbangan` (guarded `CalonPenumpang`, not in `MENU`) |
| `src/index.css` | Style-A tokens (light/dark, `:root` + `data-theme`), Tailwind `@theme` mapping (colours, radii, `desk` breakpoint 1101px, fonts), base styles, `.tabel` table styles, size tokens (`max-w-form`, `max-w-dialog`, `sm:w-kolom-tanggal`, `sm:pt-label-field`, `text-stat`) and `@utility` column layouts (`grid-cols-ringkasan`, `grid-cols-cari`) |
| `src/akses/api.ts` | `panggil()` fetch helper returning status + JSON |
| `src/akses/AuthContext.tsx` | `AuthProvider` / `useAuth`: `akun`, `masuk`, `daftar`, `keluar`, `muatUlang` (loads `/api/auth/saya` on start) |
| `src/akses/Butuh.tsx` | Route guard `<Butuh peran>`: logged out -> `/masuk?next=`, wrong role -> `PESAN_TIDAK_ADA_AKSES` only |
| `src/akses/HalamanMasuk.tsx` | Login page with demo-accounts box |
| `src/akses/HalamanDaftar.tsx` | Sign-up page (client + API field errors) |
| `src/cuti/HalamanDaftarPengajuanCuti.tsx` | US-1a page: period form (client + API field errors), table with Pill status; clears old results on a new search and ignores out-of-order responses |
| `src/cuti/HalamanRiwayatCuti.tsx` | US-1b page: pegawai select (`?nip=`), history table or "Belum ada riwayat cuti" |
| `src/cuti/HalamanSisaCuti.tsx` | US-1c page: pegawai select (`?nip=`), sisa cuti card, "Melebihi jatah" pill when negative |
| `src/cuti/PilihPegawai.tsx` | Shared pegawai `Select` (nama + NIP) loaded from `/api/cuti/pegawai` via `useMuat` |
| `src/cuti/format.ts` | `formatLama`, `VARIAN_STATUS` (`Record<StatusPengajuanCuti, VarianPill>`) |
| `src/lib/useMuat.ts` | Module-neutral GET hook `useMuat(url \| null, galatCadangan?)` -> `{ data, galat, memuat }`; ignores stale responses; `PESAN_GALAT_UMUM` |
| `src/lib/useAksi.ts` | Module-neutral write-action hook `useAksi(saatGalat)` -> `{ sibuk, jalankan }`: sets `sibuk` while the action runs and reports `PESAN_GALAT_UMUM` when it throws |
| `src/lib/tanggal.ts` | Module-neutral date formatting (id-ID): `formatTanggal` ("29 Des 2026"), `formatTanggalDenganHari` ("Sel, 29 Des 2026"); must not import any module |
| `src/tiket/HalamanCariPenerbangan.tsx` | US-3 page `/penerbangan` (public): form, field errors, flight cards ("Pesan" link only when logged out or CalonPenumpang/Member), "Penerbangan tidak ditemukan" with inputs kept (display only; logic is in `useCariPenerbangan`) |
| `src/tiket/HalamanPemesanan.tsx` | US-2a page `/pesan/:idPenerbangan` (guarded `CalonPenumpang`, not a menu item): flight summary, DataWajib form (nama/email prefilled, client validation via the domain function, API 400 marks fields), ringkasan, "Konfirmasi pemesanan" -> `/tiket-saya?baru=<kode>`; 409 (7b) shows "Kursi sudah habis" only after Konfirmasi (form and ringkasan always shown for a known flight); 7a also shows the Alert "Data penumpang wajib tidak lengkap"; unknown flight shows an error; uses `useAksi` |
| `src/tiket/HalamanTiketSaya.tsx` | "Tiket Saya" `/tiket-saya` (US-2a step 10, US-2b): booking cards (Kode, status Pill, flight info, penumpang), new booking highlighted via `?baru=`, "Batalkan" only when `dapatDibatalkan`, `Dialog` confirmation (Tidak / Ya, batalkan), empty state "Belum ada tiket"; the highlighted card has `aria-current` and an accessible label, no status banners (the result shows on the card); uses `useAksi` and `samaKode` |
| `src/tiket/InfoPenerbangan.tsx` | Flight info block (maskapai, nomor, date, asal -> tujuan with times and zone, harga) shared by the ringkasan and Tiket Saya |
| `src/tiket/useCariPenerbangan.ts` | US-3 hook: loads kota, derives the search from URL `?asal=&tujuan=&tanggal=`, validates then fetches; boundary ops `tampilkanPesan`, `tandaiKolomSalah`, `tampilkanHasil` |
| `src/tiket/PilihKota.tsx` | Kota `Select` (label, placeholder, error) over a list loaded by the caller |
| `src/tiket/format.ts` | `formatHarga` (Rupiah), `formatWaktu` (time + WIB/WITA/WIT), `VARIAN_STATUS_BOOKING` (status -> Pill variant) |
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
| `src/ui/Statistik.tsx` | `Statistik`: large number (`text-stat`) with optional note/Pill beside it and an optional 14px secondary label below |
| `src/ui/Pill.tsx` | Status `Pill` (positive/accent/warning/neutral/negative), `kelasPill` |
| `src/ui/Chip.tsx` | Toggle chip (`aria-pressed`) |
| `src/ui/Kode.tsx` | Booking code in Plex Mono |
| `src/ui/Alert.tsx` | Negative/warning/neutral alert block |
| `src/ui/EmptyState.tsx` | One-sentence empty state |
| `src/ui/DataTable.tsx` | Table wrapper using `.tabel` styles |
| `src/ui/Dialog.tsx` | `Dialog`: modal confirmation on native `<dialog>` (`buka`, `onTutup`, `judul`, `aksi`); width via `max-w-dialog`; Esc closes |
| `src/ui/Ikon.tsx` | Inline 16px line icons |
| `src/ui/tema.tsx` | `useGelap`, `TombolTema` (stores `cutiterbang-tema` in localStorage) |
