// Seed data stands in for out-of-scope systems (Data Kepegawaian, flights, cities, airlines)
// and demo accounts for each role. Must be idempotent: skips accounts whose email exists.
import { fileURLToPath } from 'node:url'
import { hariIniWib, tahunDari, type Peran } from '@cutiterbang/domain'
import { count } from 'drizzle-orm'
import { hashSandi } from '../akses/sandi.ts'
import { buatDb, type Db } from './client.ts'
import { buatDataCuti } from './dataCuti.ts'
import { buatDataPenerbangan } from './dataPenerbangan.ts'
import { akun, hariLibur, kota, maskapai, pegawai, pengajuanCuti, penerbangan } from './schema.ts'

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

// `hariIni` bisa disuntik (tes); tanggal data cuti dihitung dari tahunnya, tanggal penerbangan dari hari ini.
export async function seed(db: Db, hariIni = hariIniWib()) {
  const kataSandiHash = await hashSandi(SANDI_DEMO)
  await db
    .insert(akun)
    .values(AKUN_DEMO.map((a) => ({ ...a, kataSandiHash, dibuatPada: new Date() })))
    .onConflictDoNothing({ target: akun.email })
  await seedCuti(db, tahunDari(hariIni))
  await seedPenerbangan(db, hariIni)
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

// Katalog penerbangan (stand-in): Kota dan Maskapai idempoten per nama; Penerbangan dilewati bila sudah ada.
async function seedPenerbangan(db: Db, hariIni: string) {
  const data = buatDataPenerbangan(hariIni)
  await db.insert(kota).values(data.kota).onConflictDoNothing({ target: kota.nama })
  await db.insert(maskapai).values(data.maskapai).onConflictDoNothing({ target: maskapai.nama })
  const ada = await db.select({ n: count() }).from(penerbangan).get()
  if (ada && ada.n > 0) return
  const idKota = new Map((await db.select().from(kota)).map((k) => [k.nama, k.id]))
  const idMaskapai = new Map((await db.select().from(maskapai)).map((m) => [m.nama, m.id]))
  const baris = data.penerbangan.map(({ maskapai: m, asal, tujuan, ...sisa }) => ({
    ...sisa,
    maskapaiId: idMaskapai.get(m)!,
    asalId: idKota.get(asal)!,
    tujuanId: idKota.get(tujuan)!,
  }))
  // Dipecah supaya tidak melewati batas jumlah variabel SQLite per pernyataan.
  for (let i = 0; i < baris.length; i += 200) await db.insert(penerbangan).values(baris.slice(i, i + 200))
}

// CLI: `npm run db:seed`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seed(buatDb())
  console.log('Seed: akun demo dibuat')
}
