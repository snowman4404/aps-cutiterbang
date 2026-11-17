# CutiTerbang

Class assignment that is meant to be vibecoded: a web app with two modules behind one shared login.

- **A. Manajemen Cuti** (US-1a to 1c): an HRD manajer views leave requests, leave history and remaining leave.
- **B. Pemesanan Tiket** (US-2a to US-9): searching, booking, cancelling and tracking flights for four roles (Calon Penumpang, Member Frequent Traveller, Manajer Travel, Pengunjung).

The full spec is `docs/spesifikasi.md` (Indonesian, ~2300 lines). Read the section you need, not the whole file:

- §2 use cases: steps, extensions and exact UI messages for each US. Read before building a use case.
- §3 domain model: classes, OCL invariants, contracts C1 to C4, the StatusBooking state machine, gaps G1 to G12.
- §4 robustness and §6 sequence diagrams: boundary/control/entity names and operation names to use in code.

`docs/roadmap.md` holds the build phases, the gap decisions each phase needs, and progress checkboxes. Read it when picking the next task; tick its boxes when a task lands.

## Usage budget

The user is on a **limited usage plan**. Spend tokens like they are scarce.

- **Delegate** to a cheaper subagent (`Agent` with `model: "haiku"` for search and mechanical edits, `"sonnet"` for building a feature) whenever that costs less than doing the work here. Good fits: boilerplate, a use case built to a clear brief, broad codebase searches, running test suites with long output, reading large spec sections and summarising them.
- Keep work in this session when it needs conversation context, a design decision, or is a small edit. Starting a subagent cold costs more than those.
- A subagent starts with no context, so its brief carries everything it needs: the US number, the spec section, files to touch, the conventions below, and the command that proves it done (e.g. `npm test`, `npm run test:e2e`).
- Read files in parts, use quiet command flags, and pipe long output through `tail`.

## Codebase map

`codebase.md` maps every source file to what it does. Read it before locating code. When you add, move, rename or delete a file, update `codebase.md` in the same change.

## Submission report

`Laporan Implementasi CutiTerbang` is the report the user submits for the assignment. It is a Claude Doc written in Indonesian for the lecturer:

- Link: https://claude.ai/artifact/EwNibtK3ZAwJmbLwAFZkDC
- Doc id: `70de5993-1ae2-4604-ba70-be73b6774d4f`
- Prose body node: `44f83e45-bb20`
- Architecture diagram widget: `d7783f42-dd25`

Update it as part of the same task as the change, whenever one of these lands:

- A roadmap phase is completed. Update "Use case yang sudah dibangun", "Kemajuan dan pekerjaan tersisa", the status sentence in "Ringkasan", and the as-of date chip in the byline.
- A gap (Celah) is decided. Update "Keputusan desain" and the open-gap list in "Kemajuan".
- Test counts change. Update "Pengujian" with the numbers from an actual `npm test` and `npm run test:e2e` run.
- A module, package, route, control or boundary class is added. Update "Teknologi dan arsitektur" and redraw its diagram, keeping the existing text ids.
- Run commands, demo accounts or the demo search cases change. Update "Menjalankan aplikasi".

## Stack

npm workspaces monorepo. Scripts live in the root and each workspace's `package.json`.

- `apps/web`: React 19 + Vite + TypeScript + React Router + Tailwind v4. Proxies `/api` to the API on port 8787.
- `apps/api`: Hono on Node, SQLite through `@libsql/client` + Drizzle ORM. DB file is `apps/api/data/cutiterbang.db` (gitignored); `npm run db:reset` rebuilds it from migrations and seed.
- `packages/domain`: pure TypeScript domain logic (invariants, derived attributes like `/lamaCuti` and `/sisaKursi`, state transitions) imported by both apps. No I/O here, so it is unit-tested with Vitest.
- Demo data: seeded accounts (list and password in `packages/domain/src/akses/demo.ts`) use `*@cutiterbang.test` with password `rahasia123`; `POST /api/dev/reset` wipes every table and reseeds in-process (e2e `beforeEach` calls it); it returns 404 when `NODE_ENV=production` unless `IZINKAN_RESET=1`.
- Tests: Vitest (`npm test`) for domain logic; Playwright (`npm run test:e2e`) starts both servers itself. E2E tests run serially because they share one DB. `npm run test:visual` takes the style-review screenshots (separate Playwright project; `test:e2e` skips it).

## Conventions

- Use the spec's shared vocabulary (Indonesian class, operation and status names like `Pemesanan`, `alokasiKursi`, `WaitingForThePayment`) in code, UI text and test names. Copy user-facing messages from the spec word for word (e.g. "Anda tidak memiliki akses ke halaman ini", "Kursi sudah habis"). Where the spec gives no message, reuse its own phrase for that step or condition (e.g. ext 7a "Data penumpang wajib tidak lengkap", the format phrases "Nomor identitas 16 digit") rather than inventing one, and don't add banners for results the page already shows.
- UI uses the components in `apps/web/src/ui` and the style-A tokens in `apps/web/src/index.css`; `design/mockups/clean.html` is the visual reference.
- Keep the two modules separate: cuti and tiket never import each other; they share only auth/role checks and module-neutral helpers in `packages/domain/src/umum/` and `apps/web/src/lib/`.
- Out-of-scope external systems are simulated: Data Kepegawaian and flights come from seed data; payment (→ Booked), airline confirmation (→ Confirmed) and email are mock API endpoints, with sent emails stored so the UI can display them.
- Business rules belong in the API (backed by `packages/domain`); the web app shows what the API returns and may validate too, for faster feedback.
- Gaps (spec §3, "Celah") are the user's decisions; `docs/roadmap.md` records the decided ones (G1, G5, G8 to G12). G7 is still open: ask the user when a task depends on it.

## Environment gotchas

- Windows, no C++ build tools: native-compiled npm packages (e.g. `better-sqlite3`) fail to install. Use packages that ship prebuilt binaries or pure JS.
- npm 11 blocks install scripts by default. If a new package needs one, run `npm install-scripts ls`, then `npm install-scripts approve <pkg>`.
- TypeScript is v7 (native compiler).
