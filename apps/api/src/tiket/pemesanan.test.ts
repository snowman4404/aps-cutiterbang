import { and, count, eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  normalKode,
  PESAN_KURSI_HABIS,
  PESAN_PEMESANAN_TIDAK_DITEMUKAN,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_SUDAH_BERANGKAT,
  PESAN_SUDAH_DIBATALKAN,
  PESAN_TIDAK_ADA_AKSES,
  tambahHari,
  type InformasiPenerbangan,
  type StatusBooking,
  type TiketSaya,
} from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { buatDataPemesanan } from '../db/dataPemesanan.ts'
import { DEMO } from '../db/dataPenerbangan.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { resetData } from '../db/reset.ts'
import { akun, alokasiKursi, pemesanan, penerbangan, penumpang } from '../db/schema.ts'
import { seed, SANDI_DEMO } from '../db/seed.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { adalahKodeBentrok, antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { buatPengendaliPemesanan } from './pengendaliPemesanan.ts'

const HARI_INI = '2026-11-17'
const SEKARANG = new Date('2026-11-17T01:00:00Z') // 08:00 WIB

const DATA = {
  namaLengkap: 'Budi Santoso',
  nomorIdentitas: '3174010101900001',
  tanggalLahir: '1990-01-01',
  nomorTelepon: '081234567890',
  email: 'budi@contoh.com',
}

let db: ReturnType<typeof buatDb>
let app: ReturnType<typeof buatApp>
let idKota: Record<string, number>

const kirim = (path: string, opsi: { body?: unknown; cookie?: string; method?: string } = {}) =>
  app.request(`/api${path}`, {
    method: opsi.method ?? (opsi.body !== undefined ? 'POST' : 'GET'),
    headers: {
      ...(opsi.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opsi.cookie ? { Cookie: opsi.cookie } : {}),
    },
    body: opsi.body !== undefined ? JSON.stringify(opsi.body) : undefined,
  })

const masuk = async (email: string) => {
  const res = await kirim('/auth/masuk', { body: { email, kataSandi: SANDI_DEMO } })
  expect(res.status).toBe(200)
  return /sid=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')![0]
}

const pesan = (cookie: string | undefined, idPenerbangan: unknown, dataPenumpang: unknown = DATA) =>
  kirim('/pemesanan', { body: { idPenerbangan, dataPenumpang }, cookie })
const tiketSaya = async (cookie: string) => {
  const res = await kirim('/pemesanan/saya', { cookie })
  expect(res.status).toBe(200)
  return ((await res.json()) as { pemesanan: TiketSaya[] }).pemesanan
}
const batalkan = (cookie: string | undefined, kode: string) =>
  kirim(`/pemesanan/${encodeURIComponent(kode)}/batalkan`, { method: 'POST', cookie })
const info = async (id: number) => {
  const res = await kirim(`/penerbangan/${id}`)
  expect(res.status).toBe(200)
  return ((await res.json()) as { penerbangan: InformasiPenerbangan }).penerbangan
}
const cari = async (asal: string, tujuan: string, tanggal: string) => {
  const res = await kirim(`/penerbangan/cari?asal=${idKota[asal]}&tujuan=${idKota[tujuan]}&tanggal=${tanggal}`)
  expect(res.status).toBe(200)
  return ((await res.json()) as { penerbangan: InformasiPenerbangan[] }).penerbangan
}
const idPenerbanganNomor = async (nomor: string, tanggal: string) =>
  (await db.select({ id: penerbangan.id }).from(penerbangan).where(and(eq(penerbangan.nomorPenerbangan, nomor), eq(penerbangan.tanggalKeberangkatan, tanggal))))[0]!.id
const jumlahAlokasi = async () => (await db.select({ n: count() }).from(alokasiKursi))[0]!.n

const TANGGAL_DEMO = tambahHari(HARI_INI, DEMO.kursiTerakhir.hariKe)
const idKursiTerakhir = () => idPenerbanganNomor(DEMO.kursiTerakhir.nomorPenerbangan, TANGGAL_DEMO)
const idPadat = async () => (await cari('Jakarta', 'Denpasar', tambahHari(HARI_INI, DEMO.rutePadat.hariKe)))[0]!

beforeEach(async () => {
  db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG })
  const { kota } = (await (await kirim('/penerbangan/kota')).json()) as { kota: { id: number; nama: string }[] }
  idKota = Object.fromEntries(kota.map((k) => [k.nama, k.id]))
})

describe('GET /api/penerbangan/:id (ringkasan)', () => {
  test('publik: informasi penerbangan dengan sisaKursi dan tersedia', async () => {
    const f = await idPadat()
    const i = await info(f.id)
    expect(i).toEqual({ ...f, tersedia: true })
  })

  test('penerbangan sudah berangkat: tersedia false; sisaKursi 0 untuk yang habis', async () => {
    const berangkat = await info(await idPenerbanganNomor(DEMO.sudahBerangkat.nomorPenerbangan, HARI_INI))
    expect(berangkat.tersedia).toBe(false)
    const habis = await info(await idPenerbanganNomor(DEMO.habis.nomorPenerbangan, TANGGAL_DEMO))
    expect(habis.sisaKursi).toBe(0)
    expect(habis.tersedia).toBe(false)
  })

  test('tidak dikenal: 404', async () => {
    const res = await kirim('/penerbangan/999999')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN })
  })
})

describe('akses ke /api/pemesanan', () => {
  test('tanpa login: 401 pada semua rute', async () => {
    expect((await pesan(undefined, 1)).status).toBe(401)
    expect((await kirim('/pemesanan/saya')).status).toBe(401)
    expect((await batalkan(undefined, 'CTB001')).status).toBe(401)
  })

  test('HRDManajer, ManajerTravel dan Pengunjung: 403 dengan pesan tanpa akses', async () => {
    for (const email of ['hrd@cutiterbang.test', 'travel@cutiterbang.test', 'pengunjung1@cutiterbang.test']) {
      const cookie = await masuk(email)
      for (const res of [await pesan(cookie, 1), await kirim('/pemesanan/saya', { cookie }), await batalkan(cookie, 'CTB001')]) {
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
      }
    }
  })
})

describe('POST /api/pemesanan (US-2a, C1)', () => {
  test('berhasil: 201, status WaitingForThePayment, kode unik 6 karakter, pemesan dan penumpang tercatat', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const f = await idPadat()
    const res = await pesan(cookie, f.id)
    expect(res.status).toBe(201)
    const { pemesanan: p } = (await res.json()) as { pemesanan: TiketSaya }
    expect(p.status).toBe('WaitingForThePayment')
    expect(p.label).toBe('Waiting for the payment')
    expect(p.kode).toMatch(/^[A-Z2-9]{6}$/)
    expect(p.dapatDibatalkan).toBe(true)
    expect(p.penumpang).toEqual([DATA.namaLengkap])

    const [baris] = await db.select().from(pemesanan).where(eq(pemesanan.kode, p.kode))
    const [pemesanId] = await db.select({ id: akun.id }).from(akun).where(eq(akun.email, 'penumpang@cutiterbang.test'))
    expect(baris!.pemesanId).toBe(pemesanId!.id)
    expect(baris!.penerbanganId).toBe(f.id)
    expect(baris!.waktuDibuat.getTime()).toBe(SEKARANG.getTime())
    const pn = await db.select().from(penumpang).where(eq(penumpang.pemesananId, baris!.id))
    expect(pn).toHaveLength(1)
    expect(pn[0]).toMatchObject({ ...DATA, akunId: pemesanId!.id })
  })

  test('data penumpang di-trim sebelum disimpan', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const f = await idPadat()
    expect((await pesan(cookie, f.id, { ...DATA, namaLengkap: '  Budi Santoso  ' })).status).toBe(201)
    const [pn] = await db.select().from(penumpang).where(eq(penumpang.email, DATA.email))
    expect(pn!.namaLengkap).toBe('Budi Santoso')
  })

  test('Member frequent traveller juga boleh memesan', async () => {
    const res = await pesan(await masuk('member2@cutiterbang.test'), (await idPadat()).id)
    expect(res.status).toBe(201)
  })

  test('sisaKursi di pencarian berkurang 1; tiap pemesanan mendapat kode berbeda', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const sebelum = await idPadat()
    const a = (await (await pesan(cookie, sebelum.id)).json()) as { pemesanan: TiketSaya }
    const b = (await (await pesan(cookie, sebelum.id)).json()) as { pemesanan: TiketSaya }
    expect(normalKode(a.pemesanan.kode)).not.toBe(normalKode(b.pemesanan.kode))
    const sesudah = (await cari('Jakarta', 'Denpasar', tambahHari(HARI_INI, DEMO.rutePadat.hariKe))).find((f) => f.id === sebelum.id)!
    expect(sesudah.sisaKursi).toBe(sebelum.sisaKursi - 2)
    expect((await info(sebelum.id)).sisaKursi).toBe(sebelum.sisaKursi - 2)
  })

  test('Tiket Saya memuat pemesanan baru dengan informasi penerbangan yang sama dengan ringkasan', async () => {
    const cookie = await masuk('member2@cutiterbang.test')
    const f = await idPadat()
    const ringkasan = await info(f.id)
    const { pemesanan: baru } = (await (await pesan(cookie, f.id)).json()) as { pemesanan: TiketSaya }
    const saya = await tiketSaya(cookie)
    const ditemukan = saya.find((t) => t.kode === baru.kode)!
    expect(ditemukan).toEqual(baru)
    expect(saya[0]!.kode).toBe(baru.kode) // terbaru dulu
    expect({ ...ditemukan.penerbangan, sisaKursi: 0 }).toEqual({ ...ringkasan, sisaKursi: 0 })
    expect(ditemukan.penerbangan.sisaKursi).toBe(ringkasan.sisaKursi - 1)
  })

  test('7a: setiap kolom wajib dan berformat; 400 dengan galat per kolom dan tanpa pemesanan', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const f = await idPadat()
    const kosong = await pesan(cookie, f.id, {})
    expect(kosong.status).toBe(400)
    expect(Object.keys(((await kosong.json()) as { galat: object }).galat).sort()).toEqual([
      'email',
      'namaLengkap',
      'nomorIdentitas',
      'nomorTelepon',
      'tanggalLahir',
    ])

    const salah: Record<string, unknown> = {
      namaLengkap: 'a'.repeat(101),
      nomorIdentitas: '123',
      tanggalLahir: HARI_INI,
      nomorTelepon: '12345',
      email: 'bukan-email',
    }
    for (const [kolom, nilai] of Object.entries(salah)) {
      const res = await pesan(cookie, f.id, { ...DATA, [kolom]: nilai })
      expect(res.status).toBe(400)
      expect(Object.keys(((await res.json()) as { galat: object }).galat)).toEqual([kolom])
    }
    expect((await pesan(cookie, f.id, 'bukan objek')).status).toBe(400)
    expect(await jumlahAlokasi()).toBe(3) // hanya pemesanan seed yang tidak Cancelled
    expect((await info(f.id)).sisaKursi).toBe(f.sisaKursi)
  })

  test('penerbangan tidak dikenal atau id tidak valid: 404', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    for (const id of [999999, 'abc', null, undefined]) {
      const res = await pesan(cookie, id)
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN })
    }
  })

  test('7b: kursi terakhir hanya bisa dipesan satu kali; yang kedua 409 "Kursi sudah habis"', async () => {
    const id = await idKursiTerakhir()
    const a = await pesan(await masuk('penumpang@cutiterbang.test'), id)
    expect(a.status).toBe(201)
    const b = await pesan(await masuk('member1@cutiterbang.test'), id)
    expect(b.status).toBe(409)
    expect(await b.json()).toEqual({ pesan: PESAN_KURSI_HABIS })
    expect((await info(id)).sisaKursi).toBe(0)
    expect((await tiketSaya(await masuk('member1@cutiterbang.test'))).filter((t) => t.penerbangan.id === id)).toHaveLength(0)
  })

  test('balapan: dua pemesanan serentak untuk kursi terakhir, tepat satu berhasil dan satu 409', async () => {
    const id = await idKursiTerakhir()
    const [c1, c2] = [await masuk('penumpang@cutiterbang.test'), await masuk('member1@cutiterbang.test')]
    const hasil = await Promise.all([pesan(c1, id), pesan(c2, id)])
    expect(hasil.map((r) => r.status).sort()).toEqual([201, 409])
    expect((await info(id)).sisaKursi).toBe(0)
    const aktif = await db.select().from(alokasiKursi).where(eq(alokasiKursi.penerbanganId, id))
    expect(aktif).toHaveLength(1)
    expect(await db.select().from(pemesanan).where(eq(pemesanan.penerbanganId, id))).toHaveLength(1)
  })

  test('balapan lebih ramai: 6 pemesanan serentak untuk kursi terakhir, tepat satu berhasil', async () => {
    const id = await idKursiTerakhir()
    const cookie = await masuk('member2@cutiterbang.test')
    const hasil = await Promise.all(Array.from({ length: 6 }, () => pesan(cookie, id)))
    expect(hasil.filter((r) => r.status === 201)).toHaveLength(1)
    expect(hasil.filter((r) => r.status === 409)).toHaveLength(5)
    expect(await db.select().from(pemesanan).where(eq(pemesanan.penerbanganId, id))).toHaveLength(1)
  })

  test('penerbangan yang habis dari seed tidak muncul di pencarian dan tidak bisa dipesan', async () => {
    const tanggal = TANGGAL_DEMO
    const hasil = await cari(DEMO.habis.asal, DEMO.habis.tujuan, tanggal)
    expect(hasil.map((f) => f.nomorPenerbangan)).toEqual([DEMO.kursiTerakhir.nomorPenerbangan])
    const res = await pesan(await masuk('penumpang@cutiterbang.test'), await idPenerbanganNomor(DEMO.habis.nomorPenerbangan, tanggal))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: PESAN_KURSI_HABIS })
  })

  test('penerbangan yang sudah berangkat (G1): 409 dan tidak ada pemesanan', async () => {
    const id = await idPenerbanganNomor(DEMO.sudahBerangkat.nomorPenerbangan, HARI_INI)
    const res = await pesan(await masuk('penumpang@cutiterbang.test'), id)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: PESAN_KURSI_HABIS })
    expect(await db.select().from(pemesanan).where(eq(pemesanan.penerbanganId, id))).toHaveLength(0)
  })
})

describe('GET /api/pemesanan/saya', () => {
  test('pemesanan seed: terbaru dulu, status, label, informasi penerbangan, dapatDibatalkan', async () => {
    const saya = await tiketSaya(await masuk('penumpang@cutiterbang.test'))
    expect(saya.map((t) => [t.kode, t.status, t.label, t.dapatDibatalkan])).toEqual([
      ['CTB001', 'WaitingForThePayment', 'Waiting for the payment', true],
      ['CTB002', 'Cancelled', 'Cancelled', false],
    ])
    const seedCtb001 = buatDataPemesanan(HARI_INI).find((p) => p.kode === 'CTB001')!
    expect(saya[0]!.penumpang).toEqual([seedCtb001.penumpang.namaLengkap])
    expect(saya[0]!.penerbangan).toMatchObject({
      nomorPenerbangan: seedCtb001.nomorPenerbangan,
      tanggalKeberangkatan: seedCtb001.tanggalKeberangkatan,
      asal: { nama: 'Yogyakarta', zonaWaktu: 'Asia/Jakarta' },
      tujuan: { nama: 'Denpasar', zonaWaktu: 'Asia/Makassar' },
      tersedia: true,
    })
    const member = await tiketSaya(await masuk('member1@cutiterbang.test'))
    expect(member.map((t) => [t.kode, t.status])).toEqual([['CTB003', 'Booked']])
  })

  test('hanya milik sendiri; akun tanpa pemesanan mendapat daftar kosong', async () => {
    expect(await tiketSaya(await masuk('member2@cutiterbang.test'))).toHaveLength(1)
    const baru = await kirim('/auth/daftar', {
      body: { nama: 'Citra', email: 'citra@contoh.com', kataSandi: 'sandi12345', peran: 'CalonPenumpang' },
    })
    const cookie = /sid=([^;]*)/.exec(baru.headers.get('set-cookie') ?? '')![0]
    expect(await tiketSaya(cookie)).toEqual([])
  })

  test('Penumpang yang mewakili akun juga muncul, tetapi tanpa aksi batal (G4)', async () => {
    const [b] = await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB003')) // pemesan: member1
    const [member2] = await db.select({ id: akun.id }).from(akun).where(eq(akun.email, 'member2@cutiterbang.test'))
    await db.update(penumpang).set({ akunId: member2!.id }).where(eq(penumpang.pemesananId, b!.id))
    const saya = await tiketSaya(await masuk('member2@cutiterbang.test'))
    const t = saya.find((x) => x.kode === 'CTB003')!
    expect(t).toBeDefined()
    expect(t.dapatDibatalkan).toBe(false)
    expect((await batalkan(await masuk('member2@cutiterbang.test'), 'CTB003')).status).toBe(403)
  })
})

describe('POST /api/pemesanan/:kode/batalkan (US-2b, C3)', () => {
  test('berhasil: Cancelled, aksi hilang, kursi kembali dan alokasi dilepas', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const f = await idPadat()
    const { pemesanan: baru } = (await (await pesan(cookie, f.id)).json()) as { pemesanan: TiketSaya }
    expect((await info(f.id)).sisaKursi).toBe(f.sisaKursi - 1)

    const res = await batalkan(cookie, baru.kode)
    expect(res.status).toBe(200)
    const { pemesanan: p } = (await res.json()) as { pemesanan: TiketSaya }
    expect(p).toMatchObject({ kode: baru.kode, status: 'Cancelled', label: 'Cancelled', dapatDibatalkan: false })
    expect((await info(f.id)).sisaKursi).toBe(f.sisaKursi)
    expect((await tiketSaya(cookie)).find((t) => t.kode === baru.kode)).toMatchObject({ status: 'Cancelled', dapatDibatalkan: false })
    expect(await db.select().from(alokasiKursi).where(eq(alokasiKursi.kodeNormal, normalKode(baru.kode)))).toHaveLength(0)
  })

  test('pembatalan seed WaitingForThePayment: sisaKursi bertambah 1', async () => {
    const f = await info((await tiketSaya(await masuk('penumpang@cutiterbang.test')))[0]!.penerbangan.id)
    expect((await batalkan(await masuk('penumpang@cutiterbang.test'), 'CTB001')).status).toBe(200)
    expect((await info(f.id)).sisaKursi).toBe(f.sisaKursi + 1)
  })

  test('penerbangan yang habis muncul lagi di pencarian setelah pemesannya dibatalkan', async () => {
    expect(await cari(DEMO.habis.asal, DEMO.habis.tujuan, TANGGAL_DEMO)).toHaveLength(1)
    expect((await batalkan(await masuk('member2@cutiterbang.test'), 'CTB004')).status).toBe(200)
    const hasil = await cari(DEMO.habis.asal, DEMO.habis.tujuan, TANGGAL_DEMO)
    expect(hasil.map((f) => f.nomorPenerbangan).sort()).toEqual([DEMO.habis.nomorPenerbangan, DEMO.kursiTerakhir.nomorPenerbangan].sort())
  })

  test('kode dicocokkan tanpa membedakan kapital dan spasi tepi', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const res = await batalkan(cookie, '  ctb001 ')
    expect(res.status).toBe(200)
    expect(((await res.json()) as { pemesanan: TiketSaya }).pemesanan.kode).toBe('CTB001')
  })

  test('dua kali: 409 "Pemesanan sudah dibatalkan"; pemesanan seed yang Cancelled juga 409', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    expect((await batalkan(cookie, 'CTB001')).status).toBe(200)
    const lagi = await batalkan(cookie, 'CTB001')
    expect(lagi.status).toBe(409)
    expect(await lagi.json()).toEqual({ pesan: PESAN_SUDAH_DIBATALKAN })
    expect((await batalkan(cookie, 'CTB002')).status).toBe(409)
    expect(await jumlahAlokasi()).toBe(2)
  })

  test('kode tidak dikenal: 404; milik orang lain: 403 tanpa mengubah apa pun', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const tidakAda = await batalkan(cookie, 'ZZZZZZ')
    expect(tidakAda.status).toBe(404)
    expect(await tidakAda.json()).toEqual({ pesan: PESAN_PEMESANAN_TIDAK_DITEMUKAN })

    const orangLain = await batalkan(cookie, 'CTB003') // pemesan: member1
    expect(orangLain.status).toBe(403)
    expect(await orangLain.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
    const [b] = await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB003'))
    expect(b!.status).toBe('Booked')
  })

  test('sudah berangkat: 409 dan status tetap', async () => {
    const [{ id: pemesanId }] = await db.select({ id: akun.id }).from(akun).where(eq(akun.email, 'penumpang@cutiterbang.test'))
    const idBerangkat = await idPenerbanganNomor(DEMO.sudahBerangkat.nomorPenerbangan, HARI_INI)
    await db.insert(pemesanan).values({
      kode: 'LAMPAU', kodeNormal: 'lampau', status: 'Booked', waktuDibuat: new Date('2026-11-01T00:00:00Z'), penerbanganId: idBerangkat, pemesanId,
    })
    await db.insert(alokasiKursi).values({ penerbanganId: idBerangkat, kodeNormal: 'lampau', jumlah: 1 })
    const cookie = await masuk('penumpang@cutiterbang.test')
    const saya = await tiketSaya(cookie)
    expect(saya.find((t) => t.kode === 'LAMPAU')!.dapatDibatalkan).toBe(false) // 2a: aksi disembunyikan
    const res = await batalkan(cookie, 'LAMPAU')
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: PESAN_SUDAH_BERANGKAT })
    expect((await db.select().from(pemesanan).where(eq(pemesanan.kode, 'LAMPAU')))[0]!.status).toBe('Booked')
  })

  test('dari Booked dan dari Confirmed (G5) boleh dibatalkan', async () => {
    expect((await batalkan(await masuk('member1@cutiterbang.test'), 'CTB003')).status).toBe(200) // Booked
    await db.update(pemesanan).set({ status: 'Confirmed' satisfies StatusBooking }).where(eq(pemesanan.kode, 'CTB004'))
    const cookie = await masuk('member2@cutiterbang.test')
    expect((await tiketSaya(cookie))[0]).toMatchObject({ status: 'Confirmed', dapatDibatalkan: true })
    const res = await batalkan(cookie, 'CTB004')
    expect(res.status).toBe(200)
    expect(((await res.json()) as { pemesanan: TiketSaya }).pemesanan.status).toBe('Cancelled')
    expect(await jumlahAlokasi()).toBe(1) // tinggal CTB001
  })

  test('dua pembatalan serentak: satu 200, satu 409, kursi hanya dikembalikan sekali', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const f = await info((await tiketSaya(cookie))[0]!.penerbangan.id)
    const hasil = await Promise.all([batalkan(cookie, 'CTB001'), batalkan(cookie, 'CTB001')])
    expect(hasil.map((r) => r.status).sort()).toEqual([200, 409])
    expect((await info(f.id)).sisaKursi).toBe(f.sisaKursi + 1)
  })
})

describe('KodeUnik dan atomisitas (basis data)', () => {
  const baru = (kode: string, penerbanganId: number, pemesanId = 1) => ({
    kode,
    penerbanganId,
    pemesanId,
    waktuDibuat: SEKARANG,
    data: { namaLengkap: 'X', nomorIdentitas: '1'.repeat(16), tanggalLahir: '1990-01-01', nomorTelepon: '1'.repeat(10), email: 'x@y' },
  })

  test('kode normal ganda ditolak oleh constraint UNIQUE pada pemesanan dan alokasi_kursi', async () => {
    const [{ id: pemesanId }] = await db.select({ id: akun.id }).from(akun).limit(1)
    const f = await idPadat()
    const nilai = { kode: 'Abc123', kodeNormal: 'abc123', status: 'Cancelled' as const, waktuDibuat: SEKARANG, penerbanganId: f.id, pemesanId }
    await db.insert(pemesanan).values(nilai)
    await expect(db.insert(pemesanan).values({ ...nilai, kode: 'ABC123' })).rejects.toThrow()
    await db.insert(alokasiKursi).values({ penerbanganId: f.id, kodeNormal: 'abc123', jumlah: 1 })
    await expect(db.insert(alokasiKursi).values({ penerbanganId: f.id, kodeNormal: 'abc123', jumlah: 1 })).rejects.toThrow()
  })

  test('alokasi_kursi.jumlah harus > 0 dan status pemesanan harus salah satu dari empat', async () => {
    const f = await idPadat()
    await expect(db.insert(alokasiKursi).values({ penerbanganId: f.id, kodeNormal: 'nol', jumlah: 0 })).rejects.toThrow()
    await expect(
      db.run(sql`INSERT INTO pemesanan (kode, kode_normal, status, waktu_dibuat, penerbangan_id, pemesan_id) VALUES ('K','k','Lain',0,${f.id},1)`),
    ).rejects.toThrow()
  })

  test('alokasiKursi dengan kode yang sudah dipakai melempar bentrok dan membatalkan seluruh batch (tidak ada sisa)', async () => {
    const data = antarmukaPemesanan(db)
    const a = await idPadat()
    const b = await idKursiTerakhir()
    const [{ id: pemesanId }] = await db.select({ id: akun.id }).from(akun).limit(1)
    expect(await data.alokasiKursi(baru('ZZZ222', a.id, pemesanId), 1)).toBe('diterima')
    const sebelum = await jumlahAlokasi()
    const galat = await data.alokasiKursi(baru('zzz222', b, pemesanId), 1).catch((e: unknown) => e)
    expect(adalahKodeBentrok(galat)).toBe(true)
    expect(await jumlahAlokasi()).toBe(sebelum)
    expect(await db.select().from(pemesanan).where(eq(pemesanan.penerbanganId, b))).toHaveLength(0)
    expect((await info(b)).sisaKursi).toBe(1)
  })

  test('kode bentrok dengan pemesanan Cancelled: batch dibatalkan, alokasi tidak tertinggal', async () => {
    const data = antarmukaPemesanan(db)
    const b = await idKursiTerakhir()
    const [{ id: pemesanId }] = await db.select({ id: akun.id }).from(akun).limit(1)
    const galat = await data.alokasiKursi(baru('ctb002', b, pemesanId), 1).catch((e: unknown) => e) // CTB002 Cancelled dari seed
    expect(adalahKodeBentrok(galat)).toBe(true)
    expect((await info(b)).sisaKursi).toBe(1)
  })

  test('buatKodeUnik melewati kode yang sudah dipakai dan konfirmasi mengulang bila bentrok', async () => {
    const katalog = antarmukaKatalogPenerbangan(db)
    const data = antarmukaPemesanan(db)
    // Deret tetap: kode pertama (AAAAAA) bentrok, yang kedua (SSSSSS) bebas.
    const deret = [0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const [{ id: pemesanId }] = await db.select({ id: akun.id }).from(akun).limit(1)
    const f = await idPadat()
    expect(await data.alokasiKursi(baru('AAAAAA', f.id, pemesanId), 1)).toBe('diterima')
    const pengendali = buatPengendaliPemesanan(katalog, data, () => HARI_INI, () => SEKARANG, () => deret[i++ % deret.length]!)
    const kode = await pengendali.buatKodeUnik()
    expect(kode).not.toBe('AAAAAA')
    expect(kode).toBe('SSSSSS') // 0.5 * 32 = indeks 16 pada himpunan huruf kode
  })
})

describe('seed dan reset', () => {
  test('seed idempoten: seed ulang tidak menggandakan atau menghidupkan lagi pemesanan', async () => {
    const hitung = async () => [
      (await db.select({ n: count() }).from(pemesanan))[0]!.n,
      (await db.select({ n: count() }).from(penumpang))[0]!.n,
      await jumlahAlokasi(),
    ]
    expect(await hitung()).toEqual([4, 4, 3])
    await batalkan(await masuk('penumpang@cutiterbang.test'), 'CTB001')
    await seed(db, HARI_INI)
    await seed(db, HARI_INI)
    expect(await hitung()).toEqual([4, 4, 2])
    expect((await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB001')))[0]!.status).toBe('Cancelled')
  })

  test('seed menurut contoh: pemesanan demo untuk akun demo, tanpa Confirmed', async () => {
    const data = buatDataPemesanan(HARI_INI)
    expect(data.map((p) => [p.kode, p.status, p.akunEmail])).toEqual([
      ['CTB001', 'WaitingForThePayment', 'penumpang@cutiterbang.test'],
      ['CTB002', 'Cancelled', 'penumpang@cutiterbang.test'],
      ['CTB003', 'Booked', 'member1@cutiterbang.test'],
      ['CTB004', 'Booked', 'member2@cutiterbang.test'],
    ])
    expect(new Set(data.map((p) => normalKode(p.kode))).size).toBe(data.length)
  })

  test('reset menghapus pemesanan baru dan mengembalikan pemesanan seed', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    expect((await pesan(cookie, (await idPadat()).id)).status).toBe(201)
    await resetData(db)
    expect((await db.select({ n: count() }).from(pemesanan))[0]!.n).toBe(4)
    expect((await db.select({ n: count() }).from(penumpang))[0]!.n).toBe(4)
    expect(await jumlahAlokasi()).toBe(3)
  })
})
