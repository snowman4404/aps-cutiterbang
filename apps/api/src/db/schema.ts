// Drizzle tables. Names follow the spec's shared vocabulary (docs/spesifikasi.md §3).
// Run `npm run db:generate` after changing this file.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { Peran } from '@cutiterbang/domain'

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

export type Akun = typeof akun.$inferSelect
