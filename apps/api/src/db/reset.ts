// Menghapus semua baris lalu seed ulang, di dalam proses (file DB tidak dihapus, jadi
// aman dipakai saat server berjalan). Dipakai oleh POST /api/dev/reset dan CLI `npm run db:reset`.
import { fileURLToPath } from 'node:url'
import { buatDb, type Db } from './client.ts'
import { jalankanMigrasi } from './migrate.ts'
import {
  akun,
  alokasiKursi,
  hariLibur,
  kota,
  maskapai,
  pegawai,
  pemesanan,
  pengajuanCuti,
  penerbangan,
  penumpang,
  sesi,
} from './schema.ts'
import { seed } from './seed.ts'

export async function resetData(db: Db) {
  // Satu langkah atomik (urutan menghormati FK: anak dulu); seed di luar batch.
  await db.batch([
    db.delete(alokasiKursi),
    db.delete(penumpang),
    db.delete(pemesanan),
    db.delete(sesi),
    db.delete(akun),
    db.delete(pengajuanCuti),
    db.delete(pegawai),
    db.delete(hariLibur),
    db.delete(penerbangan),
    db.delete(maskapai),
    db.delete(kota),
  ])
  await seed(db)
}

// CLI: `npm run db:reset`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = buatDb()
  await jalankanMigrasi(db)
  await resetData(db)
  console.log('Reset: data dikembalikan ke seed')
}
