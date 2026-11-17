// Menghapus semua baris lalu seed ulang, di dalam proses (file DB tidak dihapus, jadi
// aman dipakai saat server berjalan). Dipakai oleh POST /api/dev/reset dan CLI `npm run db:reset`.
// Tabel ditemukan otomatis dari modul skema, jadi tabel baru tidak perlu didaftarkan di sini.
import { is } from 'drizzle-orm'
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { buatDb, type Db } from './client.ts'
import { dijalankanLangsung } from './cli.ts'
import { jalankanMigrasi } from './migrate.ts'
import * as skema from './schema.ts'
import { seed } from './seed.ts'

/** Semua tabel Drizzle yang diekspor modul skema. */
export function tabelSkema(): SQLiteTable[] {
  return Object.values<unknown>(skema).filter((nilai) => is(nilai, SQLiteTable)) as SQLiteTable[]
}

/** Tabel dalam urutan aman untuk dihapus: tabel yang dirujuk kunci asing dihapus setelah perujuknya. */
export function urutanHapus(): SQLiteTable[] {
  const sisa = new Set(tabelSkema())
  const urutan: SQLiteTable[] = []
  while (sisa.size > 0) {
    const siap = [...sisa].filter(
      (tabel) =>
        ![...sisa].some(
          (lain) =>
            lain !== tabel && getTableConfig(lain).foreignKeys.some((fk) => fk.reference().foreignTable === tabel),
        ),
    )
    if (siap.length === 0) throw new Error('Kunci asing saling merujuk: urutan hapus tidak dapat ditentukan')
    for (const tabel of siap) {
      urutan.push(tabel)
      sisa.delete(tabel)
    }
  }
  return urutan
}

export async function resetData(db: Db) {
  // Satu langkah atomik (urutan menghormati FK: anak dulu); seed di luar batch.
  const hapus = urutanHapus().map((tabel) => db.delete(tabel))
  await db.batch(hapus as [(typeof hapus)[number], ...(typeof hapus)[number][]])
  await seed(db)
}

// CLI: `npm run db:reset`
if (dijalankanLangsung(import.meta.url)) {
  const db = buatDb()
  await jalankanMigrasi(db)
  await resetData(db)
  console.log('Reset: data dikembalikan ke seed')
}
