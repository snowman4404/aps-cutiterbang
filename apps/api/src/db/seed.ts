// Seed data stands in for out-of-scope systems (Data Kepegawaian, flights, cities, airlines)
// and demo accounts for each role. Must be idempotent: skips accounts whose email exists.
import { fileURLToPath } from 'node:url'
import { and, eq, sql } from 'drizzle-orm'
import { hariIniWib, normalKode, tahunDari, type Peran } from '@cutiterbang/domain'
import { hashSandi } from '../akses/sandi.ts'
import { buatDb, type Db } from './client.ts'
import { buatDataCuti } from './dataCuti.ts'
import { buatDataPemesanan } from './dataPemesanan.ts'
import { buatDataPenerbangan } from './dataPenerbangan.ts'
import { akun, alokasiKursi, hariLibur, kota, maskapai, pegawai, pemesanan, pengajuanCuti, penerbangan, penumpang } from './schema.ts'

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
  await seedPemesanan(db, hariIni)
}

// Data Kepegawaian (stand-in, hanya-baca di aplikasi ini): Pegawai dan HariLibur idempoten (tidak pernah dihapus);
// PengajuanCuti dibuat untuk tahun berjalan, jadi diganti seluruhnya bila yang tersimpan bukan himpunan tahun ini
// (mis. basis data tahun lalu setelah 1 Januari). Seed ulang di tahun yang sama tidak mengubah apa pun.
async function seedCuti(db: Db, tahun: number) {
  const data = buatDataCuti(tahun)
  await db.insert(hariLibur).values(data.hariLibur).onConflictDoNothing({ target: hariLibur.tanggal })
  await db.insert(pegawai).values(data.pegawai).onConflictDoNothing({ target: pegawai.nomorIndukPegawai })
  const idPerNip = new Map((await db.select().from(pegawai)).map((b) => [b.nomorIndukPegawai, b.id]))
  const baris = data.pengajuan.map(({ nomorIndukPegawai, ...sisa }) => ({
    ...sisa,
    pegawaiId: idPerNip.get(nomorIndukPegawai)!,
  }))
  const kunci = (b: { pegawaiId: number; tanggalMulai: string; tanggalAkhir: string; status: string }) =>
    `${b.pegawaiId}|${b.tanggalMulai}|${b.tanggalAkhir}|${b.status}`
  const ada = new Set((await db.select().from(pengajuanCuti)).map(kunci))
  if (ada.size === baris.length && baris.every((b) => ada.has(kunci(b)))) return
  await db.batch([db.delete(pengajuanCuti), db.insert(pengajuanCuti).values(baris)])
}

// Katalog penerbangan (stand-in): Kota dan Maskapai idempoten per nama; Penerbangan diisi ulang bergulir
// (hari ini .. hari ini + 30): yang sudah ada dilewati dan tidak pernah dihapus (Pemesanan merujuknya).
async function seedPenerbangan(db: Db, hariIni: string) {
  const data = buatDataPenerbangan(hariIni)
  await db.insert(kota).values(data.kota).onConflictDoNothing({ target: kota.nama })
  await db.insert(maskapai).values(data.maskapai).onConflictDoNothing({ target: maskapai.nama })
  const idKota = new Map((await db.select().from(kota)).map((k) => [k.nama, k.id]))
  const idMaskapai = new Map((await db.select().from(maskapai)).map((m) => [m.nama, m.id]))
  const baris = data.penerbangan.map(({ maskapai: m, asal, tujuan, ...sisa }) => ({
    ...sisa,
    maskapaiId: idMaskapai.get(m)!,
    asalId: idKota.get(asal)!,
    tujuanId: idKota.get(tujuan)!,
  }))
  // Dipecah supaya tidak melewati batas jumlah variabel SQLite per pernyataan.
  for (let i = 0; i < baris.length; i += 200) {
    await db
      .insert(penerbangan)
      .values(baris.slice(i, i + 200))
      .onConflictDoNothing({ target: [penerbangan.nomorPenerbangan, penerbangan.tanggalKeberangkatan] })
  }
}

// Pemesanan demo (lihat dataPemesanan.ts): idempoten per kode normal, jadi pemesanan yang sudah ada (mis. yang
// sudah dibatalkan pengguna) tidak ditimpa. Tiap pemesanan masuk lewat satu batch bersama Penumpang dan, bila
// belum Cancelled, AlokasiKursi-nya (sisaKursi berkurang). Tidak ada yang Confirmed (ETiket baru di Fase 6).
async function seedPemesanan(db: Db, hariIni: string) {
  const sudahAda = new Set((await db.select({ k: pemesanan.kodeNormal }).from(pemesanan)).map((r) => r.k))
  const idAkun = new Map((await db.select({ id: akun.id, email: akun.email }).from(akun)).map((a) => [a.email, a.id]))
  for (const p of buatDataPemesanan(hariIni)) {
    const kodeNormal = normalKode(p.kode)
    if (sudahAda.has(kodeNormal)) continue
    const [f] = await db
      .select({ id: penerbangan.id })
      .from(penerbangan)
      .where(and(eq(penerbangan.nomorPenerbangan, p.nomorPenerbangan), eq(penerbangan.tanggalKeberangkatan, p.tanggalKeberangkatan)))
    const pemesanId = idAkun.get(p.akunEmail)
    if (!f || pemesanId === undefined) continue
    await db.batch([
      db.insert(pemesanan).values({
        kode: p.kode,
        kodeNormal,
        status: p.status,
        waktuDibuat: new Date(p.waktuDibuat),
        penerbanganId: f.id,
        pemesanId,
      }),
      db.insert(penumpang).values({
        pemesananId: sql`(select id from pemesanan where kode_normal = ${kodeNormal})`,
        akunId: pemesanId,
        ...p.penumpang,
      }),
      ...(p.status === 'Cancelled' ? [] : [db.insert(alokasiKursi).values({ penerbanganId: f.id, kodeNormal, jumlah: 1 })]),
    ])
  }
}

// CLI: `npm run db:seed`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seed(buatDb())
  console.log('Seed: akun demo dibuat')
}
