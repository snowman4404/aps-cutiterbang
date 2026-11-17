# Roadmap

Phases run in order: each one builds on the data and screens of the one before. A use case is done when its acceptance criteria (spec §2) pass as Playwright tests and its domain rules pass as Vitest tests. Tick boxes as work lands.

**Decision** marks a spec gap (§3 "Celah") the user must settle before that phase starts.

## Phase 0: Setup
- [x] Monorepo, web/api/domain packages, Vitest, Playwright, CLAUDE.md, codebase.md

## Phase 1: Identity & Access (shared by both modules)
**Decisions:** G11 (can one account hold several roles?), G12 (do US-4, 5a, 5b, 8a need login?), G10 (is member sign-up in scope?)
- [ ] `Akun` table with role: HRD Manajer, Calon Penumpang, Member Frequent Traveller, Manajer Travel, Pengunjung
- [ ] Seeded demo account per role; login/logout with a session cookie
- [ ] API role guard + web route guard showing "Anda tidak memiliki akses ke halaman ini"
- [ ] App shell: navigation that changes by role; "Reset data" control for demos

## Phase 2: Module A, Manajemen Cuti
**Decision:** G9 (leave spanning 31 Dec counts toward the start year; can remaining leave go negative?)
- [ ] Domain: working days (Mon–Fri minus `HariLibur`), `/lamaCuti`, `beririsan()`, `riwayatCuti()`, `/sisaCuti`
- [ ] Schema + seed: `Pegawai`, `PengajuanCuti`, `HariLibur` (stands in for Data Kepegawaian)
- [ ] US-1a Melihat pengajuan cuti per periode
- [ ] US-1b Melihat riwayat cuti pegawai
- [ ] US-1c Melihat sisa cuti pegawai

## Phase 3: Flight catalog and search
**Decision:** G1 (time zone per `Kota` so "already departed" can be computed)
- [ ] Schema + seed: `Kota`, `Maskapai`, `Penerbangan` (with `jumlahKursi`)
- [ ] Domain: `/sisaKursi`, `/tersedia`, `cocok()`
- [ ] US-3 Mencari penerbangan (no login)

## Phase 4: Booking core
**Decisions:** G5 (does cancelling a Confirmed booking void its e-tiket?), G8 (does a validated trip stay recorded after cancellation?)
- [ ] Domain: `KodeBookingReference` (case/space-insensitive, unique), `DataWajib` validation, `StatusBooking` state machine, `AlokasiKursi` (no overbooking)
- [ ] Schema: `Pemesanan`, `Penumpang`, seat allocation
- [ ] US-2a Memesan tiket (contract C1) + "Tiket Saya"
- [ ] US-2b Membatalkan pemesanan (contract C3)

## Phase 5: Member Frequent Traveller
- [ ] US-5a Memperbarui data profil (`Profil`, `/statusProfil`)
- [ ] US-5b Memvalidasi tiket (`catatPerjalanan`)
- [ ] US-4 Mencari penerbangan multi-destinasi
- [ ] US-6a Menyaring hasil pencarian berdasarkan jam keberangkatan
- [ ] US-6b Membandingkan harga penerbangan
- [ ] US-6c Memesan penerbangan dari tampilan perbandingan (includes US-2a)

## Phase 6: Manajer Travel and Pengunjung
**Decision:** G7 (block picking the same pengunjung twice in one booking?)
- [ ] US-8a Mencari penerbangan untuk pengunjung
- [ ] US-8b Memesan tiket atas nama pengunjung (contract C2)
- [ ] US-8c Melihat tiket yang dipesankan
- [ ] Simulator endpoints: payment (→ Booked), airline confirmation (→ Confirmed)
- [ ] US-8d Menerima e-tiket melalui email (stored outbox, viewable in the UI)
- [ ] US-7 Memantau status booking
- [ ] US-9 Memeriksa status booking dengan kode booking reference

## Phase 7: Polish and submission
- [ ] Design pass over all screens (consistent look, mobile width)
- [ ] Simulator/dev panel to drive payment, airline and email for the demo
- [ ] Full e2e pass; README with run instructions and demo accounts
- [ ] Deploy: API serves the built web app as one Node service (e.g. Render/Railway), reseeding SQLite on start
