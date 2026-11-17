// Drizzle tables. Names follow the spec's shared vocabulary (docs/spesifikasi.md §3).
// Run `npm run db:generate` after changing this file.
import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import type { Peran, StatusPengajuanCuti, ZonaWaktu } from '@cutiterbang/domain'

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
  status: text('status').$type<StatusPengajuanCuti>().notNull(),
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
    // inv KotaBerbeda. TidakOverbooking penuh (sisaKursi >= 0) dijaga AlokasiKursi (Fase 4); di sini hanya jumlah kursi tak negatif.
    check('penerbangan_kota_berbeda', sql`${tabel.asalId} <> ${tabel.tujuanId}`),
    check('penerbangan_jumlah_kursi_tak_negatif', sql`${tabel.jumlahKursi} >= 0`),
  ],
)

export type Akun = typeof akun.$inferSelect
