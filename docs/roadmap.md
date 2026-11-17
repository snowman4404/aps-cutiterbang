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
**Decision:** G7 (block picking the same pengunjung twice in one booking?)
Note: US-8b (contract C2) and US-8d read the Pengunjung's `Profil`, which Phase 5 creates.
- [ ] US-8a Mencari penerbangan untuk pengunjung
- [ ] US-8b Memesan tiket atas nama pengunjung (contract C2)
- [ ] US-8c Melihat tiket yang dipesankan
- [ ] Simulator endpoints: payment (→ Booked), airline confirmation (→ Confirmed)
- [ ] US-8d Menerima e-tiket melalui email (stored outbox, viewable in the UI); G5: e-tiket of a cancelled booking shown as void
- [ ] US-7 Memantau status booking
- [ ] US-9 Memeriksa status booking dengan kode booking reference

## Phase 7: Polish and submission
- [ ] Design pass over all screens (consistent look, mobile width)
- [ ] Simulator/dev panel to drive payment, airline and email for the demo
- [ ] Full e2e pass; README with run instructions and demo accounts
- [ ] Deploy: API serves the built web app as one Node service (e.g. Render/Railway), reseeding SQLite on start
