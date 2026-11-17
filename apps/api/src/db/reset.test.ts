import { count, getTableName } from 'drizzle-orm'
import { beforeEach, describe, expect, test } from 'vitest'
import { buatDb, type Db } from './client.ts'
import { jalankanMigrasi } from './migrate.ts'
import { resetData, tabelSkema, urutanHapus } from './reset.ts'
import {
  akun,
  alokasiKursi,
  emailTerkirim,
  etiket,
  hariLibur,
  kota,
  maskapai,
  pegawai,
  pemesanan,
  pengajuanCuti,
  penerbangan,
  penumpang,
  perjalananTercatat,
  profil,
  sesi,
} from './schema.ts'
import { seed } from './seed.ts'

let db: Db

beforeEach(async () => {
  db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db)
})

async function jumlahBarisPerTabel(): Promise<Record<string, number>> {
  const hasil: Record<string, number> = {}
  for (const tabel of tabelSkema()) {
    hasil[getTableName(tabel)] = (await db.select({ n: count() }).from(tabel).get())!.n
  }
  return hasil
}

// Satu baris penanda (bukan seed) per tabel; tabel baru wajib ditambahkan ke sini agar resetData teruji.
async function sisipkanBarisPenanda() {
  const akunBaru = await db
    .insert(akun)
    .values({ nama: 'Penanda', email: 'penanda@contoh.test', kataSandiHash: 'x', peran: 'CalonPenumpang', dibuatPada: new Date() })
    .returning()
    .get()
  await db.insert(sesi).values({ id: 'sesi-penanda', akunId: akunBaru.id, kedaluwarsa: new Date() })
  const pegawaiBaru = await db
    .insert(pegawai)
    .values({ nama: 'Penanda', nomorIndukPegawai: 'NIP-PENANDA', jatahCutiTahunan: 12 })
    .returning()
    .get()
  await db
    .insert(pengajuanCuti)
    .values({ pegawaiId: pegawaiBaru.id, tanggalMulai: '2020-01-01', tanggalAkhir: '2020-01-02', status: 'Diajukan' })
  await db.insert(hariLibur).values({ tanggal: '2020-01-01', keterangan: 'Penanda' })
  const asal = await db.insert(kota).values({ nama: 'Kota Penanda A', zonaWaktu: 'Asia/Jakarta' }).returning().get()
  const tujuan = await db.insert(kota).values({ nama: 'Kota Penanda B', zonaWaktu: 'Asia/Jakarta' }).returning().get()
  const maskapaiBaru = await db.insert(maskapai).values({ nama: 'Maskapai Penanda' }).returning().get()
  const penerbanganBaru = await db
    .insert(penerbangan)
    .values({
      nomorPenerbangan: 'ZZ999',
      tanggalKeberangkatan: '2020-01-01',
      waktuBerangkat: '08:00',
      waktuTiba: '09:00',
      harga: 1,
      jumlahKursi: 1,
      maskapaiId: maskapaiBaru.id,
      asalId: asal.id,
      tujuanId: tujuan.id,
    })
    .returning()
    .get()
  const pemesananBaru = await db
    .insert(pemesanan)
    .values({
      kode: 'PENANDA',
      kodeNormal: 'penanda',
      status: 'WaitingForThePayment',
      waktuDibuat: new Date(),
      penerbanganId: penerbanganBaru.id,
      pemesanId: akunBaru.id,
    })
    .returning()
    .get()
  await db.insert(penumpang).values({
    pemesananId: pemesananBaru.id,
    akunId: akunBaru.id,
    namaLengkap: 'Penanda',
    nomorIdentitas: '1234567890123456',
    tanggalLahir: '2000-01-01',
    nomorTelepon: '081234567890',
    email: 'penanda@contoh.test',
  })
  await db.insert(alokasiKursi).values({ penerbanganId: penerbanganBaru.id, kodeNormal: 'penanda', jumlah: 1 })
  await db.insert(profil).values({ akunId: akunBaru.id })
  await db.insert(etiket).values({ pemesananId: pemesananBaru.id, nomorETiket: 'ET-PENANDA', waktuTerbit: new Date() })
  await db.insert(perjalananTercatat).values({ akunId: akunBaru.id, pemesananId: pemesananBaru.id })
  await db.insert(emailTerkirim).values({ pemesananId: pemesananBaru.id, akunId: akunBaru.id, kepada: 'penanda@x.test', subjek: 'penanda', isi: 'penanda', waktuKirim: new Date() })
}

describe('resetData', () => {
  test('menemukan setiap tabel di database, jadi tabel baru tidak perlu didaftarkan', async () => {
    const hasil = await db.$client.execute(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '\\_\\_drizzle%' escape '\\'",
    )
    const diDatabase = hasil.rows.map((baris) => String(baris.name)).sort()
    expect(tabelSkema().map(getTableName).sort()).toEqual(diDatabase)
  })

  test('urutan hapus mendahulukan tabel perujuk kunci asing', () => {
    const nama = urutanHapus().map(getTableName)
    expect(nama.indexOf('sesi')).toBeLessThan(nama.indexOf('akun'))
    expect(nama.indexOf('pengajuan_cuti')).toBeLessThan(nama.indexOf('pegawai'))
    expect(nama.indexOf('penerbangan')).toBeLessThan(nama.indexOf('kota'))
    expect(nama.indexOf('penerbangan')).toBeLessThan(nama.indexOf('maskapai'))
    expect(nama.indexOf('penumpang')).toBeLessThan(nama.indexOf('pemesanan'))
    expect(nama.indexOf('pemesanan')).toBeLessThan(nama.indexOf('penerbangan'))
    expect(nama.indexOf('pemesanan')).toBeLessThan(nama.indexOf('akun'))
    expect(nama.indexOf('alokasi_kursi')).toBeLessThan(nama.indexOf('penerbangan'))
    expect(nama.indexOf('etiket')).toBeLessThan(nama.indexOf('pemesanan'))
    expect(nama.indexOf('perjalanan_tercatat')).toBeLessThan(nama.indexOf('pemesanan'))
    expect(nama.indexOf('perjalanan_tercatat')).toBeLessThan(nama.indexOf('akun'))
    expect(nama.indexOf('profil')).toBeLessThan(nama.indexOf('akun'))
  })

  test('setelah reset setiap tabel hanya berisi baris seed; baris non-seed di tabel mana pun hilang', async () => {
    const seedSaja = await jumlahBarisPerTabel()
    await sisipkanBarisPenanda()

    const denganPenanda = await jumlahBarisPerTabel()
    const tanpaPenanda = Object.keys(seedSaja).filter((nama) => denganPenanda[nama] === seedSaja[nama])
    expect(tanpaPenanda, 'tabel tanpa baris penanda: tambahkan ke sisipkanBarisPenanda').toEqual([])

    await resetData(db)
    expect(await jumlahBarisPerTabel()).toEqual(seedSaja)
    expect((await db.select().from(akun)).map((baris) => baris.email)).not.toContain('penanda@contoh.test')
  })

  test('idempoten: reset dua kali memberi hasil yang sama', async () => {
    await resetData(db)
    const pertama = await jumlahBarisPerTabel()
    await resetData(db)
    expect(await jumlahBarisPerTabel()).toEqual(pertama)
  })
})

