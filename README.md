<img src="assets/icon.svg" width="64" height="64" alt="">

# CutiTerbang

Satu aplikasi web dengan satu login untuk dua modul:

- **A. Manajemen Cuti** (US-1a sampai US-1c): HRD Manajer melihat pengajuan cuti, riwayat cuti dan sisa cuti pegawai.
- **B. Pemesanan Tiket** (US-2a sampai US-9): mencari, memesan, membatalkan dan memantau tiket pesawat untuk Calon Penumpang, Member Frequent Traveller, Manajer Travel dan Pengunjung.

Spesifikasi lengkap ada di [docs/spesifikasi.md](docs/spesifikasi.md).

## Menjalankan secara lokal

Butuh Node.js 22 atau lebih baru (dikembangkan dengan Node 24 dan npm 11).

```sh
npm install
npm run dev
```

Buka http://localhost:5173. API berjalan di port 8787; Vite meneruskan `/api` ke sana. Basis data SQLite (`apps/api/data/cutiterbang.db`) dibuat dan diisi data demo otomatis saat API pertama kali berjalan.

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | API dan web bersamaan, dengan muat ulang otomatis |
| `npm test` | Tes unit (domain) dan tes API (Vitest) |
| `npm run test:e2e` | Tes end-to-end Playwright; kedua server dijalankan otomatis |
| `npm run typecheck` | Pemeriksaan tipe semua workspace |
| `npm run db:reset` | Bangun ulang basis data dari migrasi dan seed |
| `npm run build` lalu `npm start` | Mode produksi lokal: satu proses Node di http://localhost:8787 yang menyajikan API dan web sekaligus |

## Akun demo

Semua akun memakai kata sandi `rahasia123`. Halaman Masuk juga menampilkan daftar ini.

| Peran | Email | Catatan |
| --- | --- | --- |
| HRD Manajer | `hrd@cutiterbang.test` | Modul Manajemen Cuti |
| Calon Penumpang | `penumpang@cutiterbang.test` | Memesan dan membatalkan tiket |
| Member Frequent Traveller | `member1@cutiterbang.test` | Profil lengkap |
| Member Frequent Traveller | `member2@cutiterbang.test` | Profil tidak lengkap |
| Manajer Travel | `travel@cutiterbang.test` | Memesan atas nama pengunjung, memantau status |
| Pengunjung | `pengunjung1@cutiterbang.test` | Profil lengkap, punya tiket dan email e-tiket |
| Pengunjung | `pengunjung2@cutiterbang.test` | Profil tidak lengkap, belum punya tiket |
| Pengunjung | `pengunjung3@cutiterbang.test` | Profil lengkap |

Akun baru (Calon Penumpang atau Member) bisa dibuat lewat **Daftar**.

## Kasus pencarian demo

Tanggal dihitung dari hari ini (WIB), karena data penerbangan diisi untuk hari ini sampai 30 hari ke depan.

| Pencarian | Tanggal | Hasil yang diharapkan |
| --- | --- | --- |
| Jakarta → Denpasar | Hari ini + 3 hari | 5 penerbangan, dari waktu berangkat paling awal |
| Jakarta → Jayapura | Hari ini + 5 hari | Berangkat 07:30 WIB, tiba 15:00 WIT |
| Jayapura → Makassar | Hari ini | "Penerbangan tidak ditemukan" (sudah berangkat, G1) |
| Medan → Jayapura | Kapan saja | "Penerbangan tidak ditemukan" |
| Yogyakarta → Surabaya | Hari ini + 4 hari | Hanya BW902 dengan sisa 1 kursi; SJ901 sudah penuh |

## Simulator demo

Pembayaran, konfirmasi maskapai dan layanan email berada di luar lingkup aplikasi, jadi semuanya disimulasikan. Menu **Simulator demo** di sidebar (terlihat oleh semua pengunjung situs, juga tanpa login) membuka halaman `/simulator` yang berisi:

- semua pemesanan dengan tombol **Simulasikan pembayaran** (Waiting for the payment → Booked) dan **Simulasikan konfirmasi maskapai** (Booked → Confirmed, lalu e-tiket terbit dan email dikirim ke pengunjung);
- kotak keluar email e-tiket.

Tombol **Reset data demo** di sidebar mengembalikan semua data ke seed (semua pengguna ikut keluar).

Simulator dan reset selalu aktif saat dijalankan secara lokal. Hanya bila `NODE_ENV=production` keduanya mati, kecuali `IZINKAN_RESET=1`.

Variabel lingkungan opsional untuk API:

| Variabel | Fungsi |
| --- | --- |
| `PORT` | Port server (bawaan 8787) |
| `DATABASE_URL` | Lokasi basis data (bawaan `file:data/cutiterbang.db`) |
| `IZINKAN_RESET=1` | Menyalakan simulator dan reset meskipun `NODE_ENV=production` |
| `RESET_SAAT_MULAI=1` | Mengembalikan data ke seed setiap kali server mulai (bawaan: seed hanya mengisi yang belum ada) |

## Struktur

| Folder | Isi |
| --- | --- |
| `apps/web` | React 19, Vite, TypeScript, React Router, Tailwind v4 |
| `apps/api` | Hono di Node, SQLite melalui `@libsql/client` dan Drizzle ORM |
| `packages/domain` | Logika domain murni (invarian, atribut turunan, mesin status), dipakai web dan API |
| `e2e` | Tes Playwright |
| `docs` | Spesifikasi |
