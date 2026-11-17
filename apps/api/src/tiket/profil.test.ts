import { count, eq } from 'drizzle-orm'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  cocokDengan,
  DATA_PROFIL_KOSONG,
  PESAN_KODE_TIDAK_DITEMUKAN,
  PESAN_KODE_WAJIB,
  PESAN_NOMOR_IDENTITAS,
  PESAN_NOMOR_TELEPON,
  PESAN_PROFIL_TERSIMPAN,
  PESAN_PROFIL_TIDAK_LENGKAP,
  PESAN_TIDAK_ADA_AKSES,
  PESAN_TIKET_BELUM_TERKONFIRMASI,
  PESAN_TIKET_SUDAH_TERVALIDASI,
  PESAN_TIKET_TIDAK_COCOK,
  SANDI_DEMO,
  statusProfil,
  type HasilValidasiTiket,
  type PerjalananTercatat,
  type ProfilDto,
} from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { PENUMPANG } from '../db/dataPemesanan.ts'
import { PROFIL_DEMO } from '../db/dataProfil.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { akun, etiket, pemesanan, penumpang, perjalananTercatat, profil } from '../db/schema.ts'
import { seed } from '../db/seed.ts'

const HARI_INI = '2026-11-17'
const SEKARANG = new Date('2026-11-17T01:00:00Z')

let db: ReturnType<typeof buatDb>
let app: ReturnType<typeof buatApp>

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
const ambilProfil = async (cookie: string) => {
  const res = await kirim('/profil', { cookie })
  expect(res.status).toBe(200)
  return ((await res.json()) as { profil: ProfilDto }).profil
}
const simpan = (cookie: string | undefined, body: unknown) => kirim('/profil', { method: 'PUT', body, cookie })
const validasi = (cookie: string | undefined, kode: unknown) => kirim('/validasi-tiket', { body: { kode }, cookie })
const perjalanan = async (cookie: string) => {
  const res = await kirim('/validasi-tiket/perjalanan', { cookie })
  expect(res.status).toBe(200)
  return ((await res.json()) as { perjalanan: PerjalananTercatat[] }).perjalanan
}
const jumlahPerjalanan = async () => (await db.select({ n: count() }).from(perjalananTercatat))[0]!.n
const batalkan = (cookie: string, kode: string) => kirim(`/pemesanan/${kode}/batalkan`, { method: 'POST', cookie })

const MEMBER1 = 'member1@cutiterbang.test'
const MEMBER2 = 'member2@cutiterbang.test'
const LENGKAP = PROFIL_DEMO[MEMBER1]!

beforeEach(async () => {
  db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG })
})

describe('akses (G12)', () => {
  test.each([
    ['/profil', 'GET'],
    ['/profil', 'PUT'],
    ['/validasi-tiket', 'POST'],
    ['/validasi-tiket/perjalanan', 'GET'],
  ])('%s %s: 401 tanpa login, 403 untuk peran lain, Member lolos', async (path, method) => {
    const opsi = { method, ...(method === 'GET' ? {} : { body: {} }) }
    expect((await kirim(path, opsi)).status).toBe(401)
    for (const email of ['penumpang@cutiterbang.test', 'hrd@cutiterbang.test', 'travel@cutiterbang.test', 'pengunjung1@cutiterbang.test']) {
      const res = await kirim(path, { ...opsi, cookie: await masuk(email) })
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
    }
    expect((await kirim(path, { ...opsi, cookie: await masuk(MEMBER1) })).status).not.toBe(403)
  })
})

describe('Profil (US-5a)', () => {
  test('memuat data terakhir disimpan, kolom wajib dan status', async () => {
    const lengkap = await ambilProfil(await masuk(MEMBER1))
    expect(lengkap).toEqual({
      data: LENGKAP,
      kolomWajib: ['namaLengkap', 'nomorIdentitas', 'tanggalLahir', 'nomorTelepon', 'email'],
      status: 'lengkap',
    })
    const tidak = await ambilProfil(await masuk(MEMBER2))
    expect(tidak.status).toBe('tidakLengkap')
    expect(tidak.data.nomorIdentitas).toBeNull()
  })

  test('seed: profil Member dan Pengunjung, data Sari Dewi sama dengan penumpang seed-nya', async () => {
    const baris = await db.select({ email: akun.email, nama: profil.namaLengkap }).from(profil).innerJoin(akun, eq(akun.id, profil.akunId))
    expect(Object.fromEntries(baris.map((b) => [b.email, b.nama]))).toEqual({
      [MEMBER1]: 'Sari Dewi',
      [MEMBER2]: 'Andi Pratama',
      'pengunjung1@cutiterbang.test': 'Maya Lestari',
      'pengunjung2@cutiterbang.test': 'Rizky Hidayat',
    })
    expect(LENGKAP).toEqual(PENUMPANG[MEMBER1])
    expect(statusProfil(PROFIL_DEMO['pengunjung1@cutiterbang.test']!, HARI_INI)).toBe('lengkap')
    expect(statusProfil(PROFIL_DEMO['pengunjung2@cutiterbang.test']!, HARI_INI)).toBe('tidakLengkap')
    expect(statusProfil(PROFIL_DEMO[MEMBER2]!, HARI_INI)).toBe('tidakLengkap')
  })

  test('melengkapi profil: pesan berhasil, status lengkap, data tersimpan (nilai di-trim)', async () => {
    const cookie = await masuk(MEMBER2)
    const res = await simpan(cookie, { ...PROFIL_DEMO[MEMBER2], nomorIdentitas: ' 3171010303880003 ' })
    expect(res.status).toBe(200)
    const badan = (await res.json()) as { pesan: string; profil: ProfilDto }
    expect(badan.pesan).toBe(PESAN_PROFIL_TERSIMPAN)
    expect(badan.pesan).toBe('Data profil berhasil disimpan')
    expect(badan.profil.status).toBe('lengkap')
    expect((await ambilProfil(cookie)).data.nomorIdentitas).toBe('3171010303880003')
  })

  test('kolom yang dikosongkan tersimpan NULL dan status menjadi tidak lengkap', async () => {
    const cookie = await masuk(MEMBER1)
    const res = await simpan(cookie, { ...LENGKAP, nomorTelepon: '', email: '   ' })
    expect(res.status).toBe(200)
    expect(((await res.json()) as { profil: ProfilDto }).profil.status).toBe('tidakLengkap')
    const [baris] = await db.select().from(profil).innerJoin(akun, eq(akun.id, profil.akunId)).where(eq(akun.email, MEMBER1))
    expect(baris!.profil.nomorTelepon).toBeNull()
    expect(baris!.profil.email).toBeNull()
    expect(baris!.profil.namaLengkap).toBe('Sari Dewi')
  })

  test('badan kosong mengosongkan semua kolom (semuanya opsional)', async () => {
    const cookie = await masuk(MEMBER1)
    expect((await simpan(cookie, {})).status).toBe(200)
    expect((await ambilProfil(cookie)).data).toEqual(DATA_PROFIL_KOSONG)
  })

  test('4a: kolom terisi berformat salah ditolak per kolom dan tidak ada yang tersimpan', async () => {
    const cookie = await masuk(MEMBER1)
    const res = await simpan(cookie, { ...LENGKAP, namaLengkap: 'Nama Baru', nomorIdentitas: '123', nomorTelepon: '12' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { nomorIdentitas: PESAN_NOMOR_IDENTITAS, nomorTelepon: PESAN_NOMOR_TELEPON } })
    expect((await ambilProfil(cookie)).data).toEqual(LENGKAP) // nama baru pun tidak tersimpan
  })

  test('nilai bukan string (angka JSON) ditolak 400, nilai tersimpan tidak terhapus', async () => {
    const cookie = await masuk(MEMBER1)
    const res = await simpan(cookie, { ...LENGKAP, nomorTelepon: 81234567890 })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { nomorTelepon: PESAN_NOMOR_TELEPON } })
    expect((await ambilProfil(cookie)).data).toEqual(LENGKAP)
  })

  test('kolom kosong tidak dipersoalkan walau kolom lain salah: hanya kolom salah yang ditandai', async () => {
    const res = await simpan(await masuk(MEMBER1), { namaLengkap: '', email: 'tanpa-at' })
    expect(res.status).toBe(400)
    expect(Object.keys(((await res.json()) as { galat: object }).galat)).toEqual(['email'])
  })

  test('daftar sebagai Member membuat Profil kosong; daftar sebagai CalonPenumpang tidak', async () => {
    const daftar = (email: string, peran: string) =>
      kirim('/auth/daftar', { body: { nama: 'Baru Orang', email, kataSandi: 'rahasia123', peran } })
    const res = await daftar('baru@contoh.test', 'MemberFrequentTraveller')
    expect(res.status).toBe(201)
    const cookie = /sid=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')![0]
    expect(await ambilProfil(cookie)).toMatchObject({ data: DATA_PROFIL_KOSONG, status: 'tidakLengkap' })
    const [baris] = await db.select().from(profil).innerJoin(akun, eq(akun.id, profil.akunId)).where(eq(akun.email, 'baru@contoh.test'))
    expect(baris!.profil.namaLengkap).toBeNull()
    expect((await daftar('biasa@contoh.test', 'CalonPenumpang')).status).toBe(201)
    expect(await db.select().from(profil).innerJoin(akun, eq(akun.id, profil.akunId)).where(eq(akun.email, 'biasa@contoh.test'))).toEqual([])
  })

  test('seed idempoten: seed ulang tidak menimpa perubahan profil', async () => {
    const cookie = await masuk(MEMBER1)
    await simpan(cookie, { ...LENGKAP, namaLengkap: 'Sari Baru' })
    await seed(db, HARI_INI)
    expect((await ambilProfil(cookie)).data.namaLengkap).toBe('Sari Baru')
    expect((await db.select({ n: count() }).from(profil))[0]!.n).toBe(4)
  })
})

describe('US-5b Memvalidasi tiket', () => {
  test('2a: kode kosong ditolak dengan kolom ditandai (400), bahkan sebelum status profil diperiksa', async () => {
    for (const kode of ['', '   ', undefined, 5]) {
      for (const email of [MEMBER1, MEMBER2]) {
        const res = await validasi(await masuk(email), kode)
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ galat: { kode: PESAN_KODE_WAJIB } })
      }
    }
  })

  test('3a: profil tidak lengkap ditolak sebelum kode dicari, juga untuk kode yang tidak ada', async () => {
    const cookie = await masuk(MEMBER2)
    for (const kode of ['CTB005', 'TIDAKADA']) {
      const res = await validasi(cookie, kode)
      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ pesan: PESAN_PROFIL_TIDAK_LENGKAP })
    }
    expect(await jumlahPerjalanan()).toBe(0)
  })

  test('4a: kode tidak terdaftar', async () => {
    const res = await validasi(await masuk(MEMBER1), 'TIDAKADA')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ pesan: PESAN_KODE_TIDAK_DITEMUKAN })
  })

  test('5a: status selain Confirmed (juga pemesanan orang lain dan Cancelled): "Tiket belum terkonfirmasi"', async () => {
    const cookie = await masuk(MEMBER1)
    for (const kode of ['CTB003', 'CTB001', 'CTB002']) {
      const res = await validasi(cookie, kode)
      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ pesan: PESAN_TIKET_BELUM_TERKONFIRMASI })
    }
  })

  test('6a: tiket tidak cocok = "tidak valid", tanpa data penumpang, tidak tercatat', async () => {
    const res = await validasi(await masuk(MEMBER1), 'CTB006') // milik Budi Santoso
    expect(res.status).toBe(200)
    const badan = await res.json()
    expect(badan).toEqual({ hasil: 'tidakValid', pesan: PESAN_TIKET_TIDAK_COCOK })
    expect(JSON.stringify(badan)).not.toMatch(/Budi|3171010101900001|penumpang/i)
    expect(await jumlahPerjalanan()).toBe(0)
  })

  test('sukses: "valid", tercatat, info penerbangan tanpa data penumpang; kode tanpa membedakan huruf dan spasi', async () => {
    const cookie = await masuk(MEMBER1)
    const res = await validasi(cookie, '  ctb005 ')
    expect(res.status).toBe(200)
    const badan = (await res.json()) as HasilValidasiTiket
    expect(badan).toMatchObject({ hasil: 'valid', sudahTercatat: false, perjalanan: { kode: 'CTB005', status: 'Confirmed' } })
    expect(badan).not.toHaveProperty('pesan')
    expect(JSON.stringify(badan)).not.toMatch(/Sari|3171010202920002/)
    expect(await jumlahPerjalanan()).toBe(1)
    expect((await perjalanan(cookie)).map((p) => p.kode)).toEqual(['CTB005'])
  })

  test('8a: sudah tercatat -> "Tiket sudah tervalidasi" dan tetap satu baris', async () => {
    const cookie = await masuk(MEMBER1)
    await validasi(cookie, 'CTB005')
    for (const kode of ['CTB005', 'ctb005']) {
      const res = await validasi(cookie, kode)
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ hasil: 'valid', sudahTercatat: true, pesan: PESAN_TIKET_SUDAH_TERVALIDASI })
    }
    expect(await jumlahPerjalanan()).toBe(1)
  })

  test('validasi serentak mencatat satu baris saja (UNIQUE akun + pemesanan)', async () => {
    const cookie = await masuk(MEMBER1)
    const hasil = await Promise.all([1, 2, 3, 4].map(() => validasi(cookie, 'CTB005')))
    expect(hasil.every((r) => r.status === 200)).toBe(true)
    expect(await jumlahPerjalanan()).toBe(1)
  })

  test('nama dicocokkan tanpa membedakan huruf besar dan kecil; nomor identitas harus sama persis', async () => {
    const cookie = await masuk(MEMBER1)
    await simpan(cookie, { ...LENGKAP, namaLengkap: 'SARI DEWI' })
    expect(await (await validasi(cookie, 'CTB005')).json()).toMatchObject({ hasil: 'valid', sudahTercatat: false })
    await simpan(cookie, { ...LENGKAP, nomorIdentitas: '3171010202920009' })
    expect(await (await validasi(cookie, 'CTB006')).json()).toEqual({ hasil: 'tidakValid', pesan: PESAN_TIKET_TIDAK_COCOK })
    // identitas berubah: CTB005 (data Sari lama) kini tidak cocok, walau sudah pernah tercatat
    expect(await (await validasi(cookie, 'CTB005')).json()).toEqual({ hasil: 'tidakValid', pesan: PESAN_TIKET_TIDAK_COCOK })
  })

  test('Pemesanan.cocokDengan dari baris seed: CTB005 cocok dengan Sari, CTB006 tidak', async () => {
    const baris = await db.select().from(penumpang).innerJoin(pemesanan, eq(pemesanan.id, penumpang.pemesananId))
    const pada = (kode: string) => baris.filter((b) => b.pemesanan.kode === kode).map((b) => b.penumpang)
    expect(cocokDengan(pada('CTB005'), LENGKAP)).toBe(true)
    expect(cocokDengan(pada('CTB006'), LENGKAP)).toBe(false)
  })

  test('G8: membatalkan pemesanan menghapusnya dari perjalananTercatat; ETiket tetap ada (G5)', async () => {
    const member = await masuk(MEMBER1)
    await validasi(member, 'CTB005')
    expect(await perjalanan(member)).toHaveLength(1)
    const sebelum = (await db.select({ n: count() }).from(etiket))[0]!.n

    expect((await batalkan(member, 'CTB005')).status).toBe(200)
    expect(await jumlahPerjalanan()).toBe(0)
    expect(await perjalanan(member)).toEqual([])
    expect((await db.select({ n: count() }).from(etiket))[0]!.n).toBe(sebelum)
    // Cancelled: tidak dapat divalidasi lagi
    const lagi = await validasi(member, 'CTB005')
    expect(lagi.status).toBe(409)
    expect(await lagi.json()).toEqual({ pesan: PESAN_TIKET_BELUM_TERKONFIRMASI })
  })

  test('G8: pembatalan menghapus catatan semua akun pada pemesanan itu', async () => {
    const member = await masuk(MEMBER1)
    await validasi(member, 'CTB005')
    const [lain] = await db.select().from(akun).where(eq(akun.email, MEMBER2))
    const [b] = await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB005'))
    await db.insert(perjalananTercatat).values({ akunId: lain!.id, pemesananId: b!.id })
    expect(await jumlahPerjalanan()).toBe(2)
    await batalkan(member, 'CTB005')
    expect(await jumlahPerjalanan()).toBe(0)
  })

  test('perjalananTercatat milik akun sendiri saja', async () => {
    await validasi(await masuk(MEMBER1), 'CTB005')
    expect(await perjalanan(await masuk(MEMBER2))).toEqual([])
  })
})

describe('ETiket (OCL ConfirmedPunyaETiket, ETiketHanyaSetelahConfirmed)', () => {
  test('setiap Pemesanan Confirmed punya ETiket dan ETiket hanya ada pada Confirmed atau Cancelled', async () => {
    const semua = await db.select().from(pemesanan)
    const etiketPer = new Map((await db.select().from(etiket)).map((e) => [e.pemesananId, e]))
    expect(semua.filter((b) => b.status === 'Confirmed').length).toBeGreaterThan(0)
    for (const b of semua) {
      if (b.status === 'Confirmed') expect(etiketPer.has(b.id), `${b.kode} Confirmed tanpa ETiket`).toBe(true)
      if (etiketPer.has(b.id)) expect(['Confirmed', 'Cancelled']).toContain(b.status)
    }
  })

  test('satu ETiket per Pemesanan (UNIQUE) dan membatalkan Confirmed tidak menghapus ETiket', async () => {
    const [b] = await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB006'))
    await expect(db.insert(etiket).values({ pemesananId: b!.id, nomorETiket: 'ET-LAIN', waktuTerbit: new Date() })).rejects.toThrow()
    const cookie = await masuk('penumpang@cutiterbang.test')
    expect((await batalkan(cookie, 'CTB006')).status).toBe(200)
    expect((await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB006')))[0]!.status).toBe('Cancelled')
    expect(await db.select().from(etiket).where(eq(etiket.pemesananId, b!.id))).toHaveLength(1)
  })

  test('seed idempoten: seed ulang tidak menggandakan Pemesanan Confirmed atau ETiket', async () => {
    const hitung = async () => [(await db.select({ n: count() }).from(etiket))[0]!.n, (await db.select({ n: count() }).from(pemesanan))[0]!.n]
    const awal = await hitung()
    await seed(db, HARI_INI)
    expect(await hitung()).toEqual(awal)
  })
})
