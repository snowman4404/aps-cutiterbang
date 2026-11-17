// API: simulator sistem luar (pembayaran, maskapai) dan US-8d (e-tiket + email) beserta keputusan G5 dan G6.
// App di basis data memori, seperti travel.test.ts.
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  DAFTAR_STATUS_BOOKING,
  etiketBerlaku,
  PESAN_KODE_TIDAK_DITEMUKAN,
  pesanTransisiTidakSah,
  SANDI_DEMO,
  subjekETiket,
  type HasilSimulasi,
  type RingkasanSimulator,
  type TiketSaya,
} from '@cutiterbang/domain'
import { buatApp, type OpsiApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { buatDataPemesanan } from '../db/dataPemesanan.ts'
import { PROFIL_DEMO } from '../db/dataProfil.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { akun, emailTerkirim, etiket, pemesanan, profil } from '../db/schema.ts'
import { seed } from '../db/seed.ts'

const HARI_INI = '2026-11-17'
const SEKARANG = new Date('2026-11-17T01:00:00Z')
const P1 = 'pengunjung1@cutiterbang.test'
const P3 = 'pengunjung3@cutiterbang.test'

let db: ReturnType<typeof buatDb>
let app: ReturnType<typeof buatApp>

async function siapkan(opsi: OpsiApp = {}) {
  db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG, ...opsi })
}

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
const bayar = (kode: string) => kirim(`/simulasi/pembayaran/${encodeURIComponent(kode)}`, { method: 'POST' })
const konfirmasiKursi = (kode: string) => kirim(`/simulasi/maskapai/${encodeURIComponent(kode)}`, { method: 'POST' })
const hasil = async (res: Response) => ((await res.json()) as { pemesanan: HasilSimulasi }).pemesanan

const statusDi = async (kode: string) => (await db.select().from(pemesanan).where(eq(pemesanan.kode, kode)))[0]!.status
const eTiketDi = async (kode: string) => {
  const [p] = await db.select().from(pemesanan).where(eq(pemesanan.kode, kode))
  return db.select().from(etiket).where(eq(etiket.pemesananId, p!.id))
}
const emailDi = async (kode: string) => {
  const [p] = await db.select().from(pemesanan).where(eq(pemesanan.kode, kode))
  return db.select().from(emailTerkirim).where(eq(emailTerkirim.pemesananId, p!.id))
}
const tiketDipesankan = async (email: string) =>
  ((await (await kirim('/tiket-dipesankan', { cookie: await masuk(email) })).json()) as { pemesanan: TiketSaya[] }).pemesanan
const tiketSaya = async (email: string) =>
  ((await (await kirim('/pemesanan/saya', { cookie: await masuk(email) })).json()) as { pemesanan: TiketSaya[] }).pemesanan

beforeEach(() => siapkan())

describe('simulator pembayaran: WaitingForThePayment -> Booked', () => {
  test('CTB001 menjadi Booked; tidak ada e-tiket dan tidak ada email', async () => {
    const res = await bayar('CTB001')
    expect(res.status).toBe(200)
    expect(await hasil(res)).toEqual({ kode: 'CTB001', status: 'Booked', label: 'Booked' })
    expect(await statusDi('CTB001')).toBe('Booked')
    expect(await eTiketDi('CTB001')).toHaveLength(0)
    expect(await emailDi('CTB001')).toHaveLength(0)
  })

  test('kode tidak membedakan huruf besar dan spasi di tepi (normal())', async () => {
    const res = await bayar('  ctb007 ')
    expect(res.status).toBe(200)
    expect((await hasil(res)).kode).toBe('CTB007') // kode seperti yang tampil, bukan seperti yang diketik
    expect(await statusDi('CTB007')).toBe('Booked')
  })

  test.each(['CTB003', 'CTB005', 'CTB002'])('%s (bukan WaitingForThePayment): 409 dan status tidak berubah', async (kode) => {
    const sebelum = await statusDi(kode)
    const res = await bayar(kode)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: pesanTransisiTidakSah(sebelum) })
    expect(await statusDi(kode)).toBe(sebelum)
  })

  test('kode tidak dikenal: 404', async () => {
    const res = await bayar('ZZZZZZ')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ pesan: PESAN_KODE_TIDAK_DITEMUKAN })
  })
})

describe('simulator maskapai: Booked -> Confirmed (US-8d)', () => {
  test('pemesanan Manajer Travel: status Confirmed, tepat satu ETiket, satu email ke email profil pengunjung', async () => {
    const res = await konfirmasiKursi('CTB008') // Booked, travel untuk pengunjung1
    expect(res.status).toBe(200)
    expect(await hasil(res)).toEqual({ kode: 'CTB008', status: 'Confirmed', label: 'Confirmed' })
    expect(await statusDi('CTB008')).toBe('Confirmed')

    const eTiket = await eTiketDi('CTB008')
    expect(eTiket).toHaveLength(1)
    expect(eTiket[0]!.nomorETiket).toBe('ET-CTB008')

    const email = await emailDi('CTB008')
    expect(email).toHaveLength(1)
    const [idP1] = await db.select({ id: akun.id }).from(akun).where(eq(akun.email, P1))
    expect(email[0]).toMatchObject({ kepada: PROFIL_DEMO[P1]!.email, akunId: idP1!.id, subjek: subjekETiket('CTB008') })
    // Isi: nama semua penumpang, kode booking reference, informasi penerbangan, nomor e-tiket.
    const seedCtb008 = buatDataPemesanan(HARI_INI).find((p) => p.kode === 'CTB008')!
    for (const bagian of ['Maya Lestari', 'CTB008', 'ET-CTB008', seedCtb008.nomorPenerbangan, seedCtb008.tanggalKeberangkatan])
      expect(email[0]!.isi).toContain(bagian)
    // Terkirim saat konfirmasi (sinkron), jadi jauh di bawah batas 5 menit (Asumsi 12).
    expect(email[0]!.waktuKirim.getTime() - SEKARANG.getTime()).toBeLessThanOrEqual(5 * 60_000)
    expect(email[0]!.waktuKirim.getTime()).toBe(eTiket[0]!.waktuTerbit.getTime())
  })

  test('dua pengunjung: satu email per alamat profil, dan masing-masing hanya melihat emailnya sendiri', async () => {
    expect((await bayar('CTB007')).status).toBe(200)
    expect((await konfirmasiKursi('CTB007')).status).toBe(200)
    expect((await emailDi('CTB007')).map((e) => e.kepada).sort()).toEqual([PROFIL_DEMO[P1]!.email, PROFIL_DEMO[P3]!.email].sort())

    for (const email of [P1, P3]) {
      const tiket = (await tiketDipesankan(email)).find((t) => t.kode === 'CTB007')!
      expect(tiket.status).toBe('Confirmed')
      expect(tiket.eTiket).toMatchObject({ nomor: 'ET-CTB007', berlaku: true })
      expect(tiket.emailETiket).toHaveLength(1)
      expect(tiket.emailETiket![0]).toMatchObject({ kepada: PROFIL_DEMO[email]!.email, subjek: subjekETiket('CTB007') })
      expect(tiket.emailETiket![0]!.isi).toContain('Maya Lestari, Citra Anggraini') // nama semua penumpang
    }
  })

  test('G6: email dibaca dari Profil saat dikirim, bukan dari data penumpang yang disalin saat memesan', async () => {
    const [idP1] = await db.select({ id: akun.id }).from(akun).where(eq(akun.email, P1))
    await db.update(profil).set({ email: 'maya.baru@contoh.test' }).where(eq(profil.akunId, idP1!.id))
    expect((await konfirmasiKursi('CTB008')).status).toBe(200)
    expect((await emailDi('CTB008')).map((e) => e.kepada)).toEqual(['maya.baru@contoh.test'])
  })

  test('G6: pemesanan US-2a (CTB003, member1) mendapat ETiket tetapi tidak ada email', async () => {
    expect((await konfirmasiKursi('CTB003')).status).toBe(200)
    expect(await eTiketDi('CTB003')).toHaveLength(1)
    expect(await emailDi('CTB003')).toHaveLength(0)
    expect((await tiketSaya('member1@cutiterbang.test')).find((t) => t.kode === 'CTB003')!.eTiket).toMatchObject({ nomor: 'ET-CTB003', berlaku: true })
  })

  test('kode tidak membedakan huruf besar dan spasi', async () => {
    expect((await konfirmasiKursi(' ctb008')).status).toBe(200)
    expect(await statusDi('CTB008')).toBe('Confirmed')
  })

  test.each(['CTB001', 'CTB007', 'CTB005', 'CTB002'])('%s (bukan Booked): 409; tidak ada ETiket atau email baru', async (kode) => {
    const sebelum = await statusDi(kode)
    const eTiketSebelum = (await eTiketDi(kode)).length
    const emailSebelum = (await emailDi(kode)).length
    const res = await konfirmasiKursi(kode)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: pesanTransisiTidakSah(sebelum) })
    expect(await statusDi(kode)).toBe(sebelum)
    expect((await eTiketDi(kode)).length).toBe(eTiketSebelum)
    expect((await emailDi(kode)).length).toBe(emailSebelum)
  })

  test('kode tidak dikenal: 404', async () => {
    const res = await konfirmasiKursi('ZZZZZZ')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ pesan: PESAN_KODE_TIDAK_DITEMUKAN })
  })

  test('dua konfirmasi serentak: satu berhasil, satu 409; tetap satu ETiket dan satu email', async () => {
    const [a, b] = await Promise.all([konfirmasiKursi('CTB008'), konfirmasiKursi('CTB008')])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect(await eTiketDi('CTB008')).toHaveLength(1)
    expect(await emailDi('CTB008')).toHaveLength(1)
  })

  test('dua pembayaran serentak: satu berhasil, satu 409', async () => {
    const [a, b] = await Promise.all([bayar('CTB001'), bayar('CTB001')])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect(await statusDi('CTB001')).toBe('Booked')
  })
})

describe('inv ConfirmedPunyaETiket dan ETiketHanyaSetelahConfirmed', () => {
  async function periksaInvarian() {
    const semua = await db.select().from(pemesanan)
    const punya = new Set((await db.select().from(etiket)).map((e) => e.pemesananId))
    for (const p of semua) {
      if (p.status === 'Confirmed') expect(punya.has(p.id), `${p.kode} Confirmed tanpa ETiket`).toBe(true)
      if (punya.has(p.id)) expect(['Confirmed', 'Cancelled'], `${p.kode} punya ETiket`).toContain(p.status)
    }
  }

  test('berlaku pada seed', periksaInvarian)

  test('berlaku sepanjang alur: WaitingForThePayment -> Booked -> Confirmed -> Cancelled', async () => {
    await periksaInvarian()
    await bayar('CTB001')
    await periksaInvarian()
    await konfirmasiKursi('CTB001')
    await periksaInvarian()
    expect((await kirim('/pemesanan/CTB001/batalkan', { method: 'POST', cookie: await masuk('penumpang@cutiterbang.test') })).status).toBe(200)
    expect(await statusDi('CTB001')).toBe('Cancelled')
    await periksaInvarian()
    expect(await eTiketDi('CTB001')).toHaveLength(1) // G5: e-tiket tetap ada
  })

  test('penolakan simulator tidak melanggarnya (409 pada WaitingForThePayment tanpa ETiket)', async () => {
    await konfirmasiKursi('CTB001')
    await periksaInvarian()
    expect(await eTiketDi('CTB001')).toHaveLength(0)
  })
})

describe('G5: e-tiket pemesanan yang dibatalkan', () => {
  test('dibatalkan setelah Confirmed: e-tiket tetap ada, berlaku false (void) di Tiket Saya', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    expect((await tiketSaya('penumpang@cutiterbang.test')).find((t) => t.kode === 'CTB006')!.eTiket).toMatchObject({ nomor: 'ET-CTB006', berlaku: true })
    expect((await kirim('/pemesanan/CTB006/batalkan', { method: 'POST', cookie })).status).toBe(200)
    const tiket = (await tiketSaya('penumpang@cutiterbang.test')).find((t) => t.kode === 'CTB006')!
    expect(tiket.status).toBe('Cancelled')
    expect(tiket.eTiket).toMatchObject({ nomor: 'ET-CTB006', berlaku: false })
    expect(await eTiketDi('CTB006')).toHaveLength(1)
  })

  test('seed CTB010 (Confirmed lalu Cancelled): e-tiket ada dan void; Cancelled tanpa e-tiket tetap null', async () => {
    const saya = await tiketSaya('penumpang@cutiterbang.test')
    expect(saya.find((t) => t.kode === 'CTB010')!.eTiket).toMatchObject({ nomor: 'ET-CTB010', berlaku: false })
    expect(saya.find((t) => t.kode === 'CTB002')!.eTiket).toBeNull()
  })

  test('etiketBerlaku mengikuti status: hanya Confirmed', () => {
    expect(DAFTAR_STATUS_BOOKING.filter(etiketBerlaku)).toEqual(['Confirmed'])
  })
})

describe('seed US-8d', () => {
  test('CTB009 (Confirmed, travel): e-tiket dan satu email per pengunjung ke email profilnya; pemesanan US-2a tanpa email', async () => {
    expect((await eTiketDi('CTB009')).map((e) => e.nomorETiket)).toEqual(['ET-CTB009'])
    expect((await emailDi('CTB009')).map((e) => e.kepada).sort()).toEqual([PROFIL_DEMO[P1]!.email, PROFIL_DEMO[P3]!.email].sort())
    for (const kode of ['CTB005', 'CTB006', 'CTB010']) expect(await emailDi(kode)).toHaveLength(0)
    expect((await db.select().from(emailTerkirim)).length).toBe(2)
  })

  test('pengunjung melihat emailnya pada Tiket Saya (CTB009); pemesanan tanpa email membawa daftar kosong', async () => {
    const daftar = await tiketDipesankan(P1)
    const ctb009 = daftar.find((t) => t.kode === 'CTB009')!
    expect(ctb009.eTiket).toMatchObject({ nomor: 'ET-CTB009', berlaku: true })
    expect(ctb009.emailETiket).toHaveLength(1)
    expect(ctb009.emailETiket![0]!.kepada).toBe(PROFIL_DEMO[P1]!.email)
    expect(daftar.find((t) => t.kode === 'CTB008')!.emailETiket).toEqual([])
  })
})

describe('panel simulator demo: GET /api/simulasi', () => {
  const ringkasan = async () => (await (await kirim('/simulasi')).json()) as RingkasanSimulator

  test('semua pemesanan terbaru dulu, dengan pemesan dan sistem luar yang bisa memicunya; tanpa login', async () => {
    const r = await ringkasan()
    expect(r.pemesanan).toHaveLength((await db.select().from(pemesanan)).length)
    const waktu = await Promise.all(r.pemesanan.map(async (b) => (await db.select().from(pemesanan).where(eq(pemesanan.kode, b.kode)))[0]!.waktuDibuat.getTime()))
    expect(waktu).toEqual([...waktu].sort((a, b) => b - a))
    const baris = (kode: string) => r.pemesanan.find((b) => b.kode === kode)!
    expect(baris('CTB007')).toMatchObject({ status: 'WaitingForThePayment', sistem: 'pembayaran', pemesan: 'Manajer Travel' })
    expect(baris('CTB008')).toMatchObject({ status: 'Booked', sistem: 'maskapai' })
    expect(baris('CTB009')).toMatchObject({ status: 'Confirmed', sistem: null })
    expect(baris('CTB003').pemesan).toBe('Member Frequent Traveller')
  })

  test('kotak keluar memuat email seed CTB009 dan email baru setelah konfirmasi maskapai, terbaru dulu', async () => {
    const awal = (await ringkasan()).email
    expect(awal.length).toBeGreaterThan(0)
    expect(awal.every((e) => e.kode === 'CTB009')).toBe(true)
    expect((await konfirmasiKursi('CTB008')).status).toBe(200)
    const akhir = (await ringkasan()).email
    expect(akhir).toHaveLength(awal.length + 1)
    expect(akhir[0]).toMatchObject({ kode: 'CTB008', kepada: PROFIL_DEMO[P1]!.email })
    expect(akhir[0]!.subjek).toBe(subjekETiket('CTB008'))
  })
})

describe('gerbang produksi (seperti dev/reset)', () => {
  test('NODE_ENV=production tanpa IZINKAN_RESET: kedua rute 404 dan tidak ada perubahan', async () => {
    await siapkan({ lingkungan: { NODE_ENV: 'production' } })
    expect((await bayar('CTB001')).status).toBe(404)
    expect((await konfirmasiKursi('CTB008')).status).toBe(404)
    expect((await kirim('/simulasi')).status).toBe(404)
    expect(await statusDi('CTB001')).toBe('WaitingForThePayment')
    expect(await statusDi('CTB008')).toBe('Booked')
    expect(await eTiketDi('CTB008')).toHaveLength(0)
  })

  test('NODE_ENV=production dengan IZINKAN_RESET=1: aktif', async () => {
    await siapkan({ lingkungan: { NODE_ENV: 'production', IZINKAN_RESET: '1' } })
    expect((await bayar('CTB001')).status).toBe(200)
  })

  test('di luar produksi aktif tanpa login (mewakili sistem luar)', async () => {
    await siapkan({ lingkungan: { NODE_ENV: 'development' } })
    expect((await bayar('CTB001')).status).toBe(200)
  })
})
