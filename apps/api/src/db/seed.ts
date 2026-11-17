// Seed data stands in for out-of-scope systems (Data Kepegawaian, flights, cities, airlines)
// and demo accounts for each role. Must be idempotent: skips accounts whose email exists.
import { and, eq, sql } from 'drizzle-orm'
import { AKUN_DEMO, hariIniWib, normalKode, SANDI_DEMO, STATUS_DIBATALKAN, tahunDari } from '@cutiterbang/domain'
import { hashSandi } from '../akses/sandi.ts'
import { buatDb, type Db } from './client.ts'
import { dijalankanLangsung } from './cli.ts'
import { buatDataCuti } from './dataCuti.ts'
import { buatDataPemesanan } from './dataPemesanan.ts'
import { buatDataPenerbangan } from './dataPenerbangan.ts'
import { akun, alokasiKursi, hariLibur, kota, maskapai, pegawai, pemesanan, pengajuanCuti, penerbangan, penumpang } from './schema.ts'

// `hariIni` bisa disuntik (tes); tanggal data cuti dihitung dari tahunnya, tanggal penerbangan dari hari ini.
export async function seed(db: Db, hariIni = hariIniWib()) {
  const kataSandiHash = await hashSandi(SANDI_DEMO)
  await db
    .insert(akun)
    .values(AKUN_DEMO.map((akunDemo) => ({ ...akunDemo, kataSandiHash, dibuatPada: new Date() })))
    .onConflictDoNothing({ target: akun.email })
  await seedCuti(db, tahunDari(hariIni))
  await seedPenerbangan(db, hariIni)
  await seedPemesanan(db, hariIni)
}

// Data Kepegawaian (stand-in, hanya-baca di aplikasi ini): Pegawai dan HariLibur idempoten (tidak pernah dihapus);
// PengajuanCuti dibuat untuk tahun berjalan, jadi diganti seluruhnya bila yang tersimpan bukan himpunan tahun ini
// (mis. basis data tahun lalu setelah 1 Januari). Seed ulang di tahun yang sama tidak mengubah apa pun.
async function seedCuti(db: Db, tahun: number) {
  const data = buatDataCuti(tahun)
  await db.insert(hariLibur).values(data.hariLibur).onConflictDoNothing({ target: hariLibur.tanggal })
  await db.insert(pegawai).values(data.pegawai).onConflictDoNothing({ target: pegawai.nomorIndukPegawai })
  const idPerNip = new Map((await db.select().from(pegawai)).map((pegawaiBaris) => [pegawaiBaris.nomorIndukPegawai, pegawaiBaris.id]))
  const baris = data.pengajuan.map(({ nomorIndukPegawai, ...sisa }) => ({
    ...sisa,
    pegawaiId: idPerNip.get(nomorIndukPegawai)!,
  }))
  const kunci = (cuti: { pegawaiId: number; tanggalMulai: string; tanggalAkhir: string; status: string }) =>
    `${cuti.pegawaiId}|${cuti.tanggalMulai}|${cuti.tanggalAkhir}|${cuti.status}`
  const ada = new Set((await db.select().from(pengajuanCuti)).map(kunci))
  if (ada.size === baris.length && baris.every((cuti) => ada.has(kunci(cuti)))) return
  await db.batch([db.delete(pengajuanCuti), db.insert(pengajuanCuti).values(baris)])
}

// Katalog penerbangan (stand-in): Kota dan Maskapai idempoten per nama; Penerbangan diisi ulang bergulir
// (hari ini .. hari ini + 30): yang sudah ada dilewati dan tidak pernah dihapus (Pemesanan merujuknya).
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

// Pemesanan demo (lihat dataPemesanan.ts): idempoten per kode normal, jadi pemesanan yang sudah ada (mis. yang
// sudah dibatalkan pengguna) tidak ditimpa. Tiap pemesanan masuk lewat satu batch bersama Penumpang dan, bila
// belum Cancelled, AlokasiKursi-nya (sisaKursi berkurang). Tidak ada yang Confirmed (ETiket baru di Fase 6).
async function seedPemesanan(db: Db, hariIni: string) {
  const sudahAda = new Set((await db.select({ kodeNormal: pemesanan.kodeNormal }).from(pemesanan)).map((baris) => baris.kodeNormal))
  const idAkun = new Map((await db.select({ id: akun.id, email: akun.email }).from(akun)).map((akunBaris) => [akunBaris.email, akunBaris.id]))
  for (const data of buatDataPemesanan(hariIni)) {
    const kodeNormal = normalKode(data.kode)
    if (sudahAda.has(kodeNormal)) continue
    const [terbang] = await db
      .select({ id: penerbangan.id })
      .from(penerbangan)
      .where(and(eq(penerbangan.nomorPenerbangan, data.nomorPenerbangan), eq(penerbangan.tanggalKeberangkatan, data.tanggalKeberangkatan)))
    const pemesanId = idAkun.get(data.akunEmail)
    if (!terbang || pemesanId === undefined) continue
    await db.batch([
      db.insert(pemesanan).values({
        kode: data.kode,
        kodeNormal,
        status: data.status,
        waktuDibuat: new Date(data.waktuDibuat),
        penerbanganId: terbang.id,
        pemesanId,
      }),
      db.insert(penumpang).values({
        pemesananId: sql`(select id from pemesanan where kode_normal = ${kodeNormal})`,
        akunId: pemesanId,
        ...data.penumpang,
      }),
      ...(data.status === STATUS_DIBATALKAN ? [] : [db.insert(alokasiKursi).values({ penerbanganId: terbang.id, kodeNormal, jumlah: 1 })]),
    ])
  }
}

// CLI: `npm run db:seed`
if (dijalankanLangsung(import.meta.url)) {
  await seed(buatDb())
  console.log('Seed: akun demo dibuat')
}
