// Menghapus semua baris lalu seed ulang, di dalam proses (file DB tidak dihapus, jadi
// aman dipakai saat server berjalan). Dipakai oleh POST /api/dev/reset dan CLI `npm run db:reset`.
import { fileURLToPath } from 'node:url'
import { buatDb, type Db } from './client.ts'
import { jalankanMigrasi } from './migrate.ts'
import { akun, sesi } from './schema.ts'
import { seed } from './seed.ts'

export async function resetData(db: Db) {
  await db.delete(sesi)
  await db.delete(akun)
  await seed(db)
}

// CLI: `npm run db:reset`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = buatDb()
  await jalankanMigrasi(db)
  await resetData(db)
  console.log('Reset: data dikembalikan ke seed')
}
