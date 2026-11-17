// Seed data stands in for out-of-scope systems (Data Kepegawaian, flights, cities, airlines)
// and demo accounts for each role. Must be idempotent: skips accounts whose email exists.
import { fileURLToPath } from 'node:url'
import type { Peran } from '@cutiterbang/domain'
import { hashSandi } from '../akses/sandi.ts'
import { buatDb, type Db } from './client.ts'
import { akun } from './schema.ts'

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

export async function seed(db: Db) {
  const kataSandiHash = await hashSandi(SANDI_DEMO)
  await db
    .insert(akun)
    .values(AKUN_DEMO.map((a) => ({ ...a, kataSandiHash, dibuatPada: new Date() })))
    .onConflictDoNothing({ target: akun.email })
}

// CLI: `npm run db:seed`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seed(buatDb())
  console.log('Seed: akun demo dibuat')
}
