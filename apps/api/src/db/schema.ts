// Drizzle tables. Names follow the spec's shared vocabulary (docs/spesifikasi.md §3).
// Run `npm run db:generate` after changing this file.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { Peran, StatusPengajuanCuti } from '@cutiterbang/domain'

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

export type Akun = typeof akun.$inferSelect
