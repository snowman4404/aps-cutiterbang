# Roadmap

Phases run in order: each one builds on the data and screens of the one before. A use case is done when its acceptance criteria (spec §2) pass as Playwright tests and its domain rules pass as Vitest tests. Tick boxes as work lands.

**Decision** marks a spec gap (§3 "Celah") the user must settle before that phase starts.

## Phase 0: Setup
- [x] Monorepo, web/api/domain packages, Vitest, Playwright, CLAUDE.md, codebase.md

## Phase 1: Identity & Access (shared by both modules)
**Decided (2026-11-17):**
- G11: one role per account; roles stay subclasses of `Akun` as in the spec.
- G12: US-4, 5a, 5b require login as Member Frequent Traveller; US-8a requires login as Manajer Travel.
- G10: sign-up is in scope. "Daftar" creates a new account as Calon Penumpang or Member Frequent Traveller; the role is fixed at sign-up (no upgrade), so the subclass model holds. HRD Manajer, Manajer Travel and Pengunjung exist only via seed data. A few Member accounts are seeded for demos.
- [x] `Akun` table with role: HRD Manajer, Calon Penumpang, Member Frequent Traveller, Manajer Travel, Pengunjung
- [x] Seeded demo account per role; login/logout with a session cookie
- [x] API role guard + web route guard showing "Anda tidak memiliki akses ke halaman ini"
- [x] App shell: navigation that changes by role; "Reset data" control for demos

## Phase 1b: Style foundation
**Decided (2026-11-17):** style A "Clean & professional" (`design/mockups/clean.html`, tokens in `clean.css` + `layout.css`), light + dark mode following the device with a manual toggle.
- [x] Tokens (light/dark) and IBM Plex Sans/Mono in the web app; theme toggle
- [x] Shell restyled: tinted L-frame (sidebar + top bar), white sheet, phone menu
- [x] Shared components: buttons, fields, table, status pill, chips, card, empty/error states
- [x] Phase 1 pages (masuk, daftar, beranda, placeholders, no-access) restyled

## Phase 2: Module A, Manajemen Cuti
**Decided (2026-11-17):**
- G9: a leave crossing 31 Dec counts in full toward the year of its start date (and appears only in that year's history); `/sisaCuti` may go negative and the UI flags it as over the allowance.
- [x] Domain: working days (Mon–Fri minus `HariLibur`), `/lamaCuti`, `beririsan()`, `riwayatCuti()`, `/sisaCuti`
- [x] Schema + seed: `Pegawai`, `PengajuanCuti`, `HariLibur` (stands in for Data Kepegawaian)
- [x] US-1a Melihat pengajuan cuti per periode
- [x] US-1b Melihat riwayat cuti pegawai
- [x] US-1c Melihat sisa cuti pegawai

## Phase 3: Flight catalog and search
**Decided (2026-11-17):** G1: `Kota` gets `zonaWaktu` (IANA zone: Asia/Jakarta = WIB, Asia/Makassar = WITA, Asia/Jayapura = WIT). `waktuBerangkatAbsolut()` converts the local departure date+time in the origin city's zone to an absolute instant; `/tersedia` compares it to now. "Today" (US-3 alur 3c) = server date in WIB. Arrival time is local to the destination city; the UI shows the zone abbreviation next to each time.
- [x] Schema + seed: `Kota`, `Maskapai`, `Penerbangan` (with `jumlahKursi`)
- [x] Domain: `/sisaKursi`, `/tersedia`, `cocok()`
- [x] US-3 Mencari penerbangan (no login)

## Phase 4: Booking core
**Decided (2026-11-17):**
- G5: cancelling a Confirmed booking keeps its `ETiket` row (the spec's `implies` invariant holds), but the e-tiket is shown as void ("Dibatalkan", not valid for travel) everywhere it appears. The ETiket itself lands in Phase 6 (US-8d); Phase 4 only allows the Confirmed → Cancelled transition.
- G8: cancelling a booking removes it from every member's `perjalananTercatat`, so recorded trips are only non-cancelled bookings. Built with US-5b in Phase 5 (C3 must unlink it once that table exists).
- [x] Domain: `KodeBookingReference` (case/space-insensitive, unique), `DataWajib` validation, `StatusBooking` state machine, `AlokasiKursi` (no overbooking)
- [x] Schema: `Pemesanan`, `Penumpang`, seat allocation. Replace the stub `jumlahPenumpangAktif` (always 0) in `apps/api/src/tiket/antarmukaKatalogPenerbangan.ts` with the real count, and add a sold-out seed flight (`sisaKursi` 0) once Pemesanan exists
- [x] US-2a Memesan tiket (contract C1) + "Tiket Saya"
- [x] US-2b Membatalkan pemesanan (contract C3)

## Phase 5: Member Frequent Traveller
**Decided (2026-11-17):**
- Confirmed bookings for US-5b: a minimal `ETiket` (one per Pemesanan) lands now, and Confirmed demo bookings are seeded with their ETiket, so `ConfirmedPunyaETiket` holds. Phase 6 adds the airline-confirmation simulator and email on top.
- US-6a/6b/6c tools (hour filter, price sort, compare, book from comparison) appear on the US-3 search page only for a logged-in Member Frequent Traveller.
- Applying the US-6a hour filter unselects compared flights it hides (not restored when the filter is cleared), so the count and the 3-flight limit cover only visible flights.
- The US-5b page also lists the Member's recorded trips (perjalananTercatat), so 8a and G8 are visible in the demo.
- Messages the spec gives no exact text for reuse the spec's own condition phrase: US-5b 2a "Kolom kode kosong", US-6a 3a "Jam awal atau jam akhir kosong", US-4 segment-count guard "Maksimal 5 segmen, minimal 2 segmen".
- [x] `Profil` (DataWajib, `/statusProfil`) for Member and Pengunjung; Daftar as Member creates an empty Profil; seed profiles for demo Members and Pengunjung
- [x] US-5a Memperbarui data profil (`Profil`, `/statusProfil`)
- [x] US-5b Memvalidasi tiket (`catatPerjalanan`); G8: C3 unlinks a cancelled booking from `perjalananTercatat`
- [x] US-4 Mencari penerbangan multi-destinasi
- [x] US-6a Menyaring hasil pencarian berdasarkan jam keberangkatan
- [x] US-6b Membandingkan harga penerbangan
- [x] US-6c Memesan penerbangan dari tampilan perbandingan (includes US-2a)

## Phase 6: Manajer Travel and Pengunjung
**Decided (2026-11-18):**
- G7: the same pengunjung cannot appear twice in one booking. Domain invariant `self.penumpang->isUnique(mewakili)` (inside `memenuhiPesananPengunjung`, with `validasiDaftarPengunjung` as the input check); the checkbox list cannot pick duplicates and the API rejects duplicate ids with 400 "Pengunjung yang sama dipilih dua kali dalam satu pemesanan" (the G7 row's own phrase).
- Messages with no exact spec text reuse the spec's condition phrase: US-8b empty list "Pilih satu atau lebih pengunjung terdaftar" (step 2), id that is not a registered Pengunjung "Pengunjung tidak terdaftar" (400), US-8a 2a "Jumlah penumpang wajib diisi", 2d "Jumlah penumpang harus bilangan bulat minimal 1". 5a is "Data profil tidak lengkap: <nama>" (all incomplete names, comma separated).
- US-8b order: role, list not empty and unique (400), unknown flight (404), unknown pengunjung (400), 5a profile check (409), then departed or seats < count (409 "Kursi sudah habis"). The searched jumlah is only a hint on the booking page.
- G4: bookings made by a Manajer Travel never get `dapatDibatalkan` (C3 only lets the Calon Penumpang who is the pemesan cancel).
- Demo data: `pengunjung3@cutiterbang.test` (Citra Anggraini, profil lengkap) and booking CTB007 (travel, WaitingForThePayment, for pengunjung1 + pengunjung3); pengunjung2 has no booking.
- Simulator (user decided): the external systems are mock endpoints `POST /api/simulasi/pembayaran/:kode` (WaitingForThePayment → Booked) and `POST /api/simulasi/maskapai/:kode` (Booked → Confirmed). No role guard (they stand in for other systems), but gated like `POST /api/dev/reset` (404 in production unless `IZINKAN_RESET=1`, reusing `resetDiizinkan`). Transitions go through the domain `transisi`; the status change is guarded in SQL (`WHERE status = <expected>`) inside one `db.batch` with its entry effects. Illegal transition → 409 "Status booking <label> tidak dapat diubah oleh simulasi ini" (no spec text); unknown kode → 404 "Kode booking reference tidak ditemukan".
- Simulator buttons: small "Simulasikan pembayaran" (WaitingForThePayment rows) and "Simulasikan konfirmasi maskapai" (Booked rows) in a "Simulator demo" column on the US-7 table, shown only when `/health` reports `resetAktif`, labelled as a demo simulator and not part of US-7. They move to the Phase 7 dev panel later.
- US-8d: entering Confirmed (Antarmuka Maskapai → `PengendaliETiket`) runs `ubahStatus(Confirmed)`, `terbitkanETiket` (ETiket `ET-<kode>`) and sends the e-tiket through a mock Layanan Email to every address of `penerimaETiket()` (G6: only manager bookings, to each represented pengunjung's Profil email, read at send time; US-2a bookings get an ETiket but no email). All in one `db.batch`. Sending is synchronous at confirmation, which meets the 5-minute limit (Asumsi 12); `waktu_kirim` is stored. The mock email is the outbox table `email_terkirim` (migration `0007_tired_husk`; UNIQUE pemesanan + kepada); the Pengunjung sees their emails (kepada, waktu kirim, subject, content) on `/tiket-dipesankan`.
- G5 display: every card with an ETiket shows its nomor; for a Cancelled booking the e-tiket is void: label "Dibatalkan" and the note "E-tiket ini tidak berlaku untuk perjalanan karena pemesanan dibatalkan". `TiketSaya.eTiket = { nomor, waktuTerbit, berlaku }`.
- US-7: `GET /api/travel/status?status=` (empty/absent/`semua` = Semua status; filter kept in the URL); rows = kode, all passenger names, status, newest `waktuDibuat` first. Texts: 3a "Tidak ada pemesanan dengan status ini" (spec); a status outside the five choices → 400 "Status booking tidak dikenal" (no spec text). US-9: `POST /api/travel/cek-kode`; 2a reuses "Kolom kode kosong" (as US-5b), 4a "Kode booking reference tidak ditemukan" (spec).
- Demo data: CTB008 (travel, Booked, pengunjung1), CTB009 (travel, Confirmed, pengunjung1 + pengunjung3, with ETiket and outbox emails to their Profil emails), CTB010 (penumpang, Confirmed then Cancelled, ETiket kept: G5 void demo).
Note: US-8b (contract C2) and US-8d read the Pengunjung's `Profil`, which Phase 5 creates.
- [x] US-8a Mencari penerbangan untuk pengunjung
- [x] US-8b Memesan tiket atas nama pengunjung (contract C2)
- [x] US-8c Melihat tiket yang dipesankan
- [x] Simulator endpoints: payment (→ Booked), airline confirmation (→ Confirmed)
- [x] US-8d Menerima e-tiket melalui email (stored outbox, viewable in the UI); G5: e-tiket of a cancelled booking shown as void
- [x] US-7 Memantau status booking
- [x] US-9 Memeriksa status booking dengan kode booking reference

## Phase 7: Polish and submission
**Decided (2026-11-18):**
- Phase 6 merged into master; Phase 7 on branch `fase-7-polish`.
- Dev panel: its own page `/simulator` ("Simulator demo"), not a `MENU` item and not a use case, no role guard (like `/api/simulasi`). A sidebar link shows for everyone, logged in or not, when `/health` reports `resetAktif`. The panel lists every booking (kode, pemesan role, penumpang, status) with "Simulasikan pembayaran" / "Simulasikan konfirmasi maskapai", the whole email outbox ("Kotak keluar email") and "Reset data demo". Data from `GET /api/simulasi` (same gate; when off, 404 "Simulator demo tidak aktif di lingkungan ini", no spec text). The simulator column is removed from the US-7 table. Email needs no button of its own: it is sent by the airline confirmation (US-8d), the panel shows the outbox.
- Deploy (user decided, same day): no hosting; the app is demoed locally (`npm run dev`, or `npm run build` + `npm start` as one Node process on port 8787 that also serves the built web app with an SPA fallback). A Render setup was prepared and then dropped, and `render.yaml` was deleted. `RESET_SAAT_MULAI=1` (reseed on start) stays as an optional switch.
- [x] Design pass over all screens (consistent look, mobile width)
- [x] Simulator/dev panel to drive payment, airline and email for the demo
- [x] Full e2e pass; README with run instructions and demo accounts
- [ ] ~~Deploy: API serves the built web app as one Node service (e.g. Render/Railway), reseeding SQLite on start~~ Dropped: kept local (the one-process production mode exists, no host)
