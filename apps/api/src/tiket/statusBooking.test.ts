// API: US-7 (memantau status booking) dan US-9 (memeriksa status booking dengan kode booking reference).
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  DAFTAR_STATUS_BOOKING,
  LABEL_STATUS_BOOKING,
  PESAN_FILTER_STATUS_TIDAK_SAH,
  PESAN_KODE_TIDAK_DITEMUKAN,
  PESAN_KODE_WAJIB,
  PESAN_TIDAK_ADA_AKSES,
  SANDI_DEMO,
  type BarisStatusBooking,
  type HasilCekKode,
  type StatusBooking,
} from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { buatDataPemesanan } from '../db/dataPemesanan.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { pemesanan } from '../db/schema.ts'
import { seed } from '../db/seed.ts'

const HARI_INI = '2026-11-17'
const SEKARANG = new Date('2026-11-17T01:00:00Z') // lebih baru daripada semua pemesanan seed
const TRAVEL = 'travel@cutiterbang.test'

let db: ReturnType<typeof buatDb>
let app: ReturnType<typeof buatApp>

const kirim = (path: string, opsi: { body?: unknown; cookie?: string; method?: string; mentah?: string } = {}) =>
  app.request(`/api${path}`, {
    method: opsi.method ?? (opsi.body !== undefined || opsi.mentah !== undefined ? 'POST' : 'GET'),
    headers: {
      ...(opsi.body !== undefined || opsi.mentah !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opsi.cookie ? { Cookie: opsi.cookie } : {}),
    },
    body: opsi.mentah ?? (opsi.body !== undefined ? JSON.stringify(opsi.body) : undefined),
  })
const masuk = async (email: string) => {
  const res = await kirim('/auth/masuk', { body: { email, kataSandi: SANDI_DEMO } })
  expect(res.status).toBe(200)
  return /sid=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')![0]
}

const daftar = async (status?: string) => {
  const res = await kirim(`/travel/status${status === undefined ? '' : `?status=${encodeURIComponent(status)}`}`, { cookie: await masuk(TRAVEL) })
  return { res, baris: res.status === 200 ? ((await res.json()) as { pemesanan: BarisStatusBooking[] }).pemesanan : [] }
}
const cekKode = async (kode: unknown) => kirim('/travel/cek-kode', { body: { kode }, cookie: await masuk(TRAVEL) })

// Pemesanan seed menurut waktuDibuat, yang paling baru dulu.
const seedTerbaru = () => [...buatDataPemesanan(HARI_INI)].sort((a, b) => b.waktuDibuat - a.waktuDibuat)
const keBaris = (p: ReturnType<typeof buatDataPemesanan>[number]): BarisStatusBooking => ({
  kode: p.kode,
  penumpang: p.penumpang.map((orang) => orang.data.namaLengkap),
  status: p.status,
  label: LABEL_STATUS_BOOKING[p.status],
})

beforeEach(async () => {
  db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG })
})

describe('akses (G12, ekstensi *a)', () => {
  test.each([
    ['GET /travel/status', () => kirim('/travel/status')],
    ['POST /travel/cek-kode', () => kirim('/travel/cek-kode', { body: { kode: 'CTB001' } })],
  ])('%s tanpa login: 401', async (_nama, panggil) => {
    expect((await panggil()).status).toBe(401)
  })

  test.each(['hrd', 'penumpang', 'member1', 'pengunjung1'])('%s: 403 dengan pesan tanpa akses, data pemesanan tetap tersembunyi', async (nama) => {
    const cookie = await masuk(`${nama}@cutiterbang.test`)
    for (const res of [await kirim('/travel/status', { cookie }), await kirim('/travel/cek-kode', { body: { kode: 'CTB001' }, cookie })]) {
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
    }
  })
})

describe('US-7 GET /api/travel/status', () => {
  test('1: tanpa filter, semua pemesanan terbaru dulu; baris = kode, nama semua penumpang, status', async () => {
    const { res, baris } = await daftar()
    expect(res.status).toBe(200)
    expect(baris).toEqual(seedTerbaru().map(keBaris))
    expect(baris.map((b) => b.kode)).toEqual(['CTB007', 'CTB001', 'CTB008', 'CTB003', 'CTB004', 'CTB005', 'CTB006', 'CTB009', 'CTB002', 'CTB010'])
    expect(baris.find((b) => b.kode === 'CTB007')!.penumpang).toEqual(['Maya Lestari', 'Citra Anggraini']) // semua penumpang
  })

  test('mencakup pemesanan US-2a maupun US-8b, dan yang baru dibuat tampil di atas', async () => {
    const [barisSeed] = await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB006'))
    const dataPenumpang = { namaLengkap: 'Budi Santoso', nomorIdentitas: '3174010101900001', tanggalLahir: '1990-01-01', nomorTelepon: '081234567890', email: 'budi@contoh.test' }
    const us2a = await kirim('/pemesanan', { body: { idPenerbangan: barisSeed!.penerbanganId, dataPenumpang }, cookie: await masuk('penumpang@cutiterbang.test') })
    expect(us2a.status).toBe(201)
    const kode2a = ((await us2a.json()) as { pemesanan: { kode: string } }).pemesanan.kode
    expect((await daftar()).baris[0]).toMatchObject({ kode: kode2a, status: 'WaitingForThePayment', penumpang: ['Budi Santoso'] })

    const [idP2] = (await (await kirim('/travel/pengunjung', { cookie: await masuk(TRAVEL) })).json() as { pengunjung: { id: number; status: string }[] }).pengunjung.filter((p) => p.status === 'lengkap')
    const us8b = await kirim('/travel/pemesanan', { body: { idPenerbangan: barisSeed!.penerbanganId, pengunjung: [idP2!.id] }, cookie: await masuk(TRAVEL) })
    expect(us8b.status).toBe(201)
    const kode8b = ((await us8b.json()) as { pemesanan: { kode: string } }).pemesanan.kode
    const { baris } = await daftar()
    expect(baris).toHaveLength(seedTerbaru().length + 2)
    expect(baris.slice(0, 2).map((x) => x.kode)).toEqual([kode8b, kode2a])
  })

  test.each(DAFTAR_STATUS_BOOKING)('3: filter %s hanya menampilkan status itu, urutan tetap terbaru dulu', async (status) => {
    const { res, baris } = await daftar(status)
    expect(res.status).toBe(200)
    expect(baris).toEqual(seedTerbaru().filter((p) => p.status === status).map(keBaris))
    expect(baris.length).toBeGreaterThan(0)
    expect(baris.every((b) => b.status === status && b.label === LABEL_STATUS_BOOKING[status])).toBe(true)
  })

  test('2a: "Semua status" (semua, kosong atau tanpa parameter) menampilkan semua pemesanan kembali', async () => {
    const semua = (await daftar()).baris
    for (const param of ['semua', '']) expect((await daftar(param)).baris).toEqual(semua)
    expect((await daftar('Confirmed')).baris.length).toBeLessThan(semua.length)
  })

  test('3a: status tanpa pemesanan menghasilkan daftar kosong (pesan "Tidak ada pemesanan dengan status ini" di halaman)', async () => {
    await db.update(pemesanan).set({ status: 'Booked' }).where(eq(pemesanan.status, 'WaitingForThePayment'))
    const { res, baris } = await daftar('WaitingForThePayment')
    expect(res.status).toBe(200)
    expect(baris).toEqual([])
  })

  test.each(['booked', 'Hangus', 'Semua', 'WaitingForThePayment,Booked'])('status tidak dikenal "%s": 400', async (status) => {
    const { res } = await daftar(status)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ pesan: PESAN_FILTER_STATUS_TIDAK_SAH })
  })

  test('membaca saja: tidak mengubah data pemesanan', async () => {
    const sebelum = await db.select().from(pemesanan)
    await daftar()
    await daftar('Booked')
    expect(await db.select().from(pemesanan)).toEqual(sebelum)
  })
})

describe('US-9 POST /api/travel/cek-kode', () => {
  test('5: status booking, nama semua penumpang, nomor penerbangan dan tanggal keberangkatan', async () => {
    const res = await cekKode('CTB007')
    expect(res.status).toBe(200)
    const ctb007 = buatDataPemesanan(HARI_INI).find((p) => p.kode === 'CTB007')!
    expect(await res.json()).toEqual({
      status: {
        kode: 'CTB007',
        status: 'WaitingForThePayment',
        label: 'Waiting for the payment',
        penumpang: ['Maya Lestari', 'Citra Anggraini'],
        nomorPenerbangan: ctb007.nomorPenerbangan,
        tanggalKeberangkatan: ctb007.tanggalKeberangkatan,
      } satisfies HasilCekKode,
    })
  })

  test.each(buatDataPemesanan(HARI_INI).map((p) => [p.kode, p] as const))('%s: setiap pemesanan seed ditemukan dengan datanya', async (kode, p) => {
    const { status } = (await (await cekKode(kode)).json()) as { status: HasilCekKode }
    expect(status).toEqual({
      kode,
      status: p.status as StatusBooking,
      label: LABEL_STATUS_BOOKING[p.status],
      penumpang: p.penumpang.map((orang) => orang.data.namaLengkap),
      nomorPenerbangan: p.nomorPenerbangan,
      tanggalKeberangkatan: p.tanggalKeberangkatan,
    })
  })

  test.each(['ctb007', 'CTB007', '  ctb007  ', 'Ctb007\t'])('3: huruf besar/kecil dan spasi di tepi diabaikan ("%s")', async (kode) => {
    const res = await cekKode(kode)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { status: HasilCekKode }).status.kode).toBe('CTB007') // kode seperti tersimpan
  })

  test.each([[''], ['   '], [undefined], [null], [5], [{}]])('2a: kolom kode kosong atau bukan teks (%j): 400 menandai kolom, tanpa data', async (kode) => {
    const res = await cekKode(kode)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { kode: PESAN_KODE_WAJIB } })
  })

  test('2a: badan bukan JSON diperlakukan sebagai kode kosong', async () => {
    const res = await kirim('/travel/cek-kode', { mentah: 'bukan json', cookie: await masuk(TRAVEL) })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { kode: PESAN_KODE_WAJIB } })
  })

  test('4a: kode tidak terdaftar: 404 dengan pesan spesifikasi dan tanpa data pemesanan', async () => {
    const res = await cekKode('ZZZZZZ')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ pesan: PESAN_KODE_TIDAK_DITEMUKAN })
  })

  test('4a lalu memperbaiki kode: pemeriksaan berikutnya berhasil (tanpa keadaan tersisa)', async () => {
    expect((await cekKode('CTB07')).status).toBe(404)
    expect((await cekKode('CTB007')).status).toBe(200)
  })

  test('membaca saja: tidak mengubah data pemesanan', async () => {
    const sebelum = await db.select().from(pemesanan)
    await cekKode('CTB001')
    await cekKode('ZZZZZZ')
    expect(await db.select().from(pemesanan)).toEqual(sebelum)
  })
})
