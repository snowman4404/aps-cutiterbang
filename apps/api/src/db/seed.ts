// Seed data stands in for out-of-scope systems (Data Kepegawaian, flights, cities, airlines)
// and demo accounts for each role. Must be idempotent: skips accounts whose email exists.
import { and, eq, sql } from 'drizzle-orm'
import {
  AKUN_DEMO,
  hariIniWib,
  normalKode,
  SANDI_DEMO,
  siapkanETiket,
  STATUS_DIBATALKAN,
  tahunDari,
} from '@cutiterbang/domain'
import { hashSandi } from '../akses/sandi.ts'
import { buatDb, type Db } from './client.ts'
import { dijalankanLangsung } from './cli.ts'
import { buatDataCuti } from './dataCuti.ts'
import { buatDataPemesanan } from './dataPemesanan.ts'
import { PROFIL_DEMO } from './dataProfil.ts'
import { buatDataPenerbangan } from './dataPenerbangan.ts'
import { akun, alokasiKursi, emailTerkirim, etiket, hariLibur, kota, maskapai, pegawai, pemesanan, pengajuanCuti, penerbangan, penumpang, profil } from './schema.ts'

// `hariIni` bisa disuntik (tes); tanggal data cuti dihitung dari tahunnya, tanggal penerbangan dari hari ini.
export async function seed(db: Db, hariIni = hariIniWib()) {
  const kataSandiHash = await hashSandi(SANDI_DEMO)
  await db
    .insert(akun)
    .values(AKUN_DEMO.map((akunDemo) => ({ ...akunDemo, kataSandiHash, dibuatPada: new Date() })))
    .onConflictDoNothing({ target: akun.email })
  await seedCuti(db, tahunDari(hariIni))
  await seedPenerbangan(db, hariIni)
  await seedProfil(db)
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

// Profil demo (lihat dataProfil.ts): hanya dibuat bila akunnya belum punya Profil, jadi perubahan pengguna tidak ditimpa.
async function seedProfil(db: Db) {
  const idAkun = new Map((await db.select({ id: akun.id, email: akun.email }).from(akun)).map((akunBaris) => [akunBaris.email, akunBaris.id]))
  const baris = Object.entries(PROFIL_DEMO).flatMap(([email, data]) => (idAkun.has(email) ? [{ akunId: idAkun.get(email)!, ...data }] : []))
  if (baris.length > 0) await db.insert(profil).values(baris).onConflictDoNothing({ target: profil.akunId })
}

// Pemesanan demo (lihat dataPemesanan.ts): idempoten per kode normal, jadi pemesanan yang sudah ada (mis. yang
// sudah dibatalkan pengguna) tidak ditimpa. Tiap pemesanan masuk lewat satu batch bersama Penumpang dan, bila
// belum Cancelled, AlokasiKursi-nya (sisaKursi berkurang). Pemesanan Confirmed (dan yang Confirmed lalu Cancelled, G5)
// ikut membawa satu ETiket (inv ConfirmedPunyaETiket); pemesanan Manajer Travel yang punya e-tiket juga membawa
// email e-tiketnya di kotak keluar, ke email profil tiap pengunjung (penerimaETiket, G6).
async function seedPemesanan(db: Db, hariIni: string) {
  const sudahAda = new Set((await db.select({ kodeNormal: pemesanan.kodeNormal }).from(pemesanan)).map((baris) => baris.kodeNormal))
  const idAkun = new Map((await db.select({ id: akun.id, email: akun.email }).from(akun)).map((akunBaris) => [akunBaris.email, akunBaris.id]))
  const kotaMenurutId = new Map((await db.select().from(kota)).map((kotaBaris) => [kotaBaris.id, kotaBaris]))
  const peranAkun = new Map(AKUN_DEMO.map((a) => [a.email, a.peran]))
  for (const data of buatDataPemesanan(hariIni)) {
    const kodeNormal = normalKode(data.kode)
    if (sudahAda.has(kodeNormal)) continue
    const [baris] = await db
      .select({ terbang: penerbangan, maskapai: maskapai.nama })
      .from(penerbangan)
      .innerJoin(maskapai, eq(maskapai.id, penerbangan.maskapaiId))
      .where(and(eq(penerbangan.nomorPenerbangan, data.nomorPenerbangan), eq(penerbangan.tanggalKeberangkatan, data.tanggalKeberangkatan)))
    const terbang = baris?.terbang
    const pemesanId = idAkun.get(data.akunEmail)
    if (!terbang || pemesanId === undefined || data.penumpang.some((orang) => !idAkun.has(orang.akunEmail))) continue
    const punyaETiket = data.status === 'Confirmed' || data.punyaETiket === true
    const waktuTerbit = new Date(data.waktuDibuat + 3_600_000)
    const eTiket = siapkanETiket(
      data.kode,
      peranAkun.get(data.akunEmail)!,
      data.penumpang.map((orang) => ({
        akunId: idAkun.get(orang.akunEmail)!,
        namaLengkap: orang.data.namaLengkap,
        profilEmail: PROFIL_DEMO[orang.akunEmail]?.email ?? null,
      })),
      { ...terbang, maskapai: baris.maskapai, asal: kotaMenurutId.get(terbang.asalId)!, tujuan: kotaMenurutId.get(terbang.tujuanId)! },
    )
    await db.batch([
      db.insert(pemesanan).values({
        kode: data.kode,
        kodeNormal,
        status: data.status,
        waktuDibuat: new Date(data.waktuDibuat),
        penerbanganId: terbang.id,
        pemesanId,
      }),
      ...data.penumpang.map((orang) =>
        db.insert(penumpang).values({
          pemesananId: sql`(select id from pemesanan where kode_normal = ${kodeNormal})`,
          akunId: idAkun.get(orang.akunEmail)!,
          ...orang.data,
        }),
      ),
      ...(data.status === STATUS_DIBATALKAN
        ? []
        : [db.insert(alokasiKursi).values({ penerbanganId: terbang.id, kodeNormal, jumlah: data.penumpang.length })]),
      ...(punyaETiket
        ? [
            db.insert(etiket).values({
              pemesananId: sql`(select id from pemesanan where kode_normal = ${kodeNormal})`,
              nomorETiket: eTiket.nomorETiket,
              waktuTerbit,
            }),
          ]
        : []),
      // Email e-tiket dikirim semenit setelah terbit (di bawah batas 5 menit, Asumsi 12).
      ...(punyaETiket ? eTiket.email : []).map((e) =>
        db.insert(emailTerkirim).values({
          pemesananId: sql`(select id from pemesanan where kode_normal = ${kodeNormal})`,
          ...e,
          waktuKirim: new Date(waktuTerbit.getTime() + 60_000),
        }),
      ),
    ])
  }
}

// CLI: `npm run db:seed`
if (dijalankanLangsung(import.meta.url)) {
  await seed(buatDb())
  console.log('Seed: akun demo dibuat')
}
