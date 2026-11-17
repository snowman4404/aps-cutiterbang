// Seed data stands in for out-of-scope systems (Data Kepegawaian, flights, cities, airlines)
// and demo accounts for each role. Must be idempotent: skips accounts whose email exists.
import { AKUN_DEMO, hariIniWib, SANDI_DEMO, tahunDari } from '@cutiterbang/domain'
import { count } from 'drizzle-orm'
import { hashSandi } from '../akses/sandi.ts'
import { buatDb, type Db } from './client.ts'
import { dijalankanLangsung } from './cli.ts'
import { buatDataCuti } from './dataCuti.ts'
import { buatDataPenerbangan } from './dataPenerbangan.ts'
import { akun, hariLibur, kota, maskapai, pegawai, pengajuanCuti, penerbangan } from './schema.ts'

// `hariIni` bisa disuntik (tes); tanggal data cuti dihitung dari tahunnya, tanggal penerbangan dari hari ini.
export async function seed(db: Db, hariIni = hariIniWib()) {
  const kataSandiHash = await hashSandi(SANDI_DEMO)
  await db
    .insert(akun)
    .values(AKUN_DEMO.map((akunDemo) => ({ ...akunDemo, kataSandiHash, dibuatPada: new Date() })))
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
  const idPerNip = new Map(baris.map((pegawaiBaris) => [pegawaiBaris.nomorIndukPegawai, pegawaiBaris.id]))
  await db.insert(pengajuanCuti).values(
    data.pengajuan.map(({ nomorIndukPegawai, ...sisa }) => ({
      ...sisa,
      pegawaiId: idPerNip.get(nomorIndukPegawai)!,
    })),
  )
}

// Katalog penerbangan (stand-in): Kota dan Maskapai idempoten per nama; Penerbangan diisi ulang bergulir
// (hari ini .. hari ini + 30): yang sudah ada dilewati dan tidak pernah dihapus (Pemesanan Fase 4 merujuknya).
async function seedPenerbangan(db: Db, hariIni: string) {
  const data = buatDataPenerbangan(hariIni)
  await db.insert(kota).values(data.kota).onConflictDoNothing({ target: kota.nama })
  await db.insert(maskapai).values(data.maskapai).onConflictDoNothing({ target: maskapai.nama })
  const idKota = new Map((await db.select().from(kota)).map((kotaBaris) => [kotaBaris.nama, kotaBaris.id]))
  const idMaskapai = new Map((await db.select().from(maskapai)).map((maskapaiBaris) => [maskapaiBaris.nama, maskapaiBaris.id]))
  const baris = data.penerbangan.map(({ maskapai: namaMaskapai, asal, tujuan, ...sisa }) => ({
    ...sisa,
    maskapaiId: idMaskapai.get(namaMaskapai)!,
    asalId: idKota.get(asal)!,
    tujuanId: idKota.get(tujuan)!,
  }))
  // Dipecah supaya tidak melewati batas jumlah variabel SQLite per pernyataan.
  for (let awal = 0; awal < baris.length; awal += 200) {
    await db
      .insert(penerbangan)
      .values(baris.slice(awal, awal + 200))
      .onConflictDoNothing({ target: [penerbangan.nomorPenerbangan, penerbangan.tanggalKeberangkatan] })
  }
}

// CLI: `npm run db:seed`
if (dijalankanLangsung(import.meta.url)) {
  await seed(buatDb())
  console.log('Seed: akun demo dibuat')
}
