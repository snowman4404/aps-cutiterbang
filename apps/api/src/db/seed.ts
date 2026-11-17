// Seed data stands in for out-of-scope systems (Data Kepegawaian, flights, cities, airlines)
// and demo accounts for each role. Must be idempotent: skips accounts whose email exists.
import { fileURLToPath } from 'node:url'
import { hariIniWib, tahunDari, type Peran } from '@cutiterbang/domain'
import { count } from 'drizzle-orm'
import { hashSandi } from '../akses/sandi.ts'
import { buatDb, type Db } from './client.ts'
import { buatDataCuti } from './dataCuti.ts'
import { akun, hariLibur, pegawai, pengajuanCuti } from './schema.ts'

export const SANDI_DEMO = 'rahasia123'

export const AKUN_DEMO: { nama: string; email: string; peran: Peran }[] = [
  { nama: 'Rina Wulandari', email: 'hrd@cutiterbang.test', peran: 'HRDManajer' },
  { nama: 'Budi Santoso', email: 'penumpang@cutiterbang.test', peran: 'CalonPenumpang' },
  { nama: 'Sari Dewi', email: 'member1@cutiterbang.test', peran: 'MemberFrequentTraveller' },
  { nama: 'Andi Pratama', email: 'member2@cutiterbang.test', peran: 'MemberFrequentTraveller' },
  { nama: 'Dimas Saputra', email: 'travel@cutiterbang.test', peran: 'ManajerTravel' },
  { nama: 'Maya Lestari', email: 'pengunjung1@cutiterbang.test', peran: 'Pengunjung' },
  { nama: 'Rizky Hidayat', email: 'pengunjung2@cutiterbang.test', peran: 'Pengunjung' },
]

// `hariIni` bisa disuntik (tes); tanggal data cuti dihitung dari tahunnya.
export async function seed(db: Db, hariIni = hariIniWib()) {
  const kataSandiHash = await hashSandi(SANDI_DEMO)
  await db
    .insert(akun)
    .values(AKUN_DEMO.map((a) => ({ ...a, kataSandiHash, dibuatPada: new Date() })))
    .onConflictDoNothing({ target: akun.email })
  await seedCuti(db, tahunDari(hariIni))
}

// Data Kepegawaian (stand-in): dilewati bila pegawai sudah ada, supaya tidak menggandakan pengajuan.
async function seedCuti(db: Db, tahun: number) {
  const data = buatDataCuti(tahun)
  await db.insert(hariLibur).values(data.hariLibur).onConflictDoNothing({ target: hariLibur.tanggal })
  const ada = await db.select({ n: count() }).from(pegawai).get()
  if (ada && ada.n > 0) return
  await db.insert(pegawai).values(data.pegawai).onConflictDoNothing({ target: pegawai.nomorIndukPegawai })
  const baris = await db.select().from(pegawai)
  const idPerNip = new Map(baris.map((b) => [b.nomorIndukPegawai, b.id]))
  await db.insert(pengajuanCuti).values(
    data.pengajuan.map(({ nomorIndukPegawai, ...sisa }) => ({
      ...sisa,
      pegawaiId: idPerNip.get(nomorIndukPegawai)!,
    })),
  )
}

// CLI: `npm run db:seed`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seed(buatDb())
  console.log('Seed: akun demo dibuat')
}
