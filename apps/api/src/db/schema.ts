// Drizzle tables. Names follow the spec's shared vocabulary (docs/spesifikasi.md §3).
// Run `npm run db:generate` after changing this file.
import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { DAFTAR_STATUS_BOOKING, DAFTAR_STATUS_PENGAJUAN, type Peran, type ZonaWaktu } from '@cutiterbang/domain'

export const akun = sqliteTable('akun', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  email: text('email').notNull().unique(), // disimpan huruf kecil + trim
  kataSandiHash: text('kata_sandi_hash').notNull(),
  peran: text('peran').$type<Peran>().notNull(),
  dibuatPada: integer('dibuat_pada', { mode: 'timestamp' }).notNull(),
})

export const sesi = sqliteTable('sesi', {
  id: text('id').primaryKey(), // token acak
  akunId: integer('akun_id')
    .notNull()
    .references(() => akun.id),
  kedaluwarsa: integer('kedaluwarsa', { mode: 'timestamp' }).notNull(),
})

// Modul cuti: stand-in Data Kepegawaian (sistem luar, hanya data seed). Tanggal = teks ISO YYYY-MM-DD.
export const pegawai = sqliteTable('pegawai', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  nomorIndukPegawai: text('nomor_induk_pegawai').notNull().unique(),
  jatahCutiTahunan: integer('jatah_cuti_tahunan').notNull(),
})

export const pengajuanCuti = sqliteTable('pengajuan_cuti', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pegawaiId: integer('pegawai_id')
    .notNull()
    .references(() => pegawai.id),
  tanggalMulai: text('tanggal_mulai').notNull(),
  tanggalAkhir: text('tanggal_akhir').notNull(),
  status: text('status', { enum: DAFTAR_STATUS_PENGAJUAN }).notNull(),
})

export const hariLibur = sqliteTable('hari_libur', {
  tanggal: text('tanggal').primaryKey(),
  keterangan: text('keterangan').notNull(),
})

// Modul tiket: katalog penerbangan (Kota, Maskapai, Penerbangan). Tanggal = teks ISO, waktu = teks lokal 'HH:MM'.
export const kota = sqliteTable('kota', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull().unique(),
  zonaWaktu: text('zona_waktu').$type<ZonaWaktu>().notNull(), // zona IANA (G1)
})

export const maskapai = sqliteTable('maskapai', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull().unique(),
})

export const penerbangan = sqliteTable(
  'penerbangan',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nomorPenerbangan: text('nomor_penerbangan').notNull(),
    tanggalKeberangkatan: text('tanggal_keberangkatan').notNull(),
    waktuBerangkat: text('waktu_berangkat').notNull(), // lokal di kota asal
    waktuTiba: text('waktu_tiba').notNull(), // lokal di kota tujuan
    harga: integer('harga').notNull(), // Rupiah per penumpang
    jumlahKursi: integer('jumlah_kursi').notNull(),
    maskapaiId: integer('maskapai_id')
      .notNull()
      .references(() => maskapai.id),
    asalId: integer('asal_id')
      .notNull()
      .references(() => kota.id),
    tujuanId: integer('tujuan_id')
      .notNull()
      .references(() => kota.id),
  },
  (tabel) => [
    unique().on(tabel.nomorPenerbangan, tabel.tanggalKeberangkatan),
    // inv KotaBerbeda. TidakOverbooking penuh (sisaKursi >= 0) dijaga AlokasiKursi (tabel alokasi_kursi); di sini hanya jumlah kursi tak negatif.
    check('penerbangan_kota_berbeda', sql`${tabel.asalId} <> ${tabel.tujuanId}`),
    check('penerbangan_jumlah_kursi_tak_negatif', sql`${tabel.jumlahKursi} >= 0`),
  ],
)

// Modul tiket: Pemesanan (akar agregat) dan Penumpang (bagian dari Pemesanan; menyimpan salinan DataWajib).
export const pemesanan = sqliteTable(
  'pemesanan',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kode: text('kode').notNull(), // KodeBookingReference sebagaimana ditampilkan
    kodeNormal: text('kode_normal').notNull().unique(), // normal() = trim + huruf kecil; inv KodeUnik (G3)
    status: text('status', { enum: DAFTAR_STATUS_BOOKING }).notNull(),
    waktuDibuat: integer('waktu_dibuat', { mode: 'timestamp_ms' }).notNull(),
    penerbanganId: integer('penerbangan_id')
      .notNull()
      .references(() => penerbangan.id),
    pemesanId: integer('pemesan_id')
      .notNull()
      .references(() => akun.id),
  },
  (tabel) => [
    check('pemesanan_status_sah', sql`${tabel.status} in ('WaitingForThePayment', 'Booked', 'Confirmed', 'Cancelled')`),
    index('pemesanan_pemesan').on(tabel.pemesanId),
  ],
)

export const penumpang = sqliteTable(
  'penumpang',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    pemesananId: integer('pemesanan_id')
      .notNull()
      .references(() => pemesanan.id, { onDelete: 'cascade' }),
    /** Peran `mewakili`: akun yang diwakili baris penumpang ini (Tiket Saya, US-8c); C1 dan C2 selalu mengisinya. */
    akunId: integer('akun_id')
      .notNull()
      .references(() => akun.id),
    // Salinan DataWajib saat pemesanan dibuat.
    namaLengkap: text('nama_lengkap').notNull(),
    nomorIdentitas: text('nomor_identitas').notNull(),
    tanggalLahir: text('tanggal_lahir').notNull(),
    nomorTelepon: text('nomor_telepon').notNull(),
    email: text('email').notNull(),
  },
  (tabel) => [
    index('penumpang_pemesanan').on(tabel.pemesananId),
    index('penumpang_akun').on(tabel.akunId),
    // Bagian tak bergantung waktu dari inv DataPenumpangLengkap: kelima kolom DataWajib terisi. Format dijaga domain.
    check('penumpang_nama_terisi', sql`length(trim(${tabel.namaLengkap})) > 0`),
    check('penumpang_identitas_terisi', sql`length(trim(${tabel.nomorIdentitas})) > 0`),
    check('penumpang_tanggal_lahir_terisi', sql`length(trim(${tabel.tanggalLahir})) > 0`),
    check('penumpang_telepon_terisi', sql`length(trim(${tabel.nomorTelepon})) > 0`),
    check('penumpang_email_terisi', sql`length(trim(${tabel.email})) > 0`),
  ],
)

// AlokasiKursi: entitas desain di dalam agregat Penerbangan (spec "Batas agregat"). Satu baris per Pemesanan yang
// tidak Cancelled; sisaKursi = jumlahKursi - SUM(jumlah). Dibuat bersyarat secara atomik (lihat antarmukaPemesanan).
export const alokasiKursi = sqliteTable(
  'alokasi_kursi',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    penerbanganId: integer('penerbangan_id')
      .notNull()
      .references(() => penerbangan.id),
    kodeNormal: text('kode_normal').notNull().unique(),
    jumlah: integer('jumlah').notNull(),
  },
  (tabel) => [
    check('alokasi_kursi_jumlah_positif', sql`${tabel.jumlah} > 0`),
    index('alokasi_kursi_penerbangan').on(tabel.penerbanganId),
  ],
)

export type Akun = typeof akun.$inferSelect
