// API: Manajer Travel dan Pengunjung (US-8a, US-8b = kontrak C2, US-8c). App di basis data memori, seperti pemesanan.test.ts.
import { and, count, eq } from 'drizzle-orm'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  memenuhiDataPenumpangLengkap,
  memenuhiPesananPengunjung,
  PESAN_ASAL_WAJIB,
  PESAN_DAFTAR_PENGUNJUNG_KOSONG,
  PESAN_JUMLAH_TIDAK_SAH,
  PESAN_JUMLAH_WAJIB,
  PESAN_KOTA_SAMA,
  PESAN_KURSI_HABIS,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_PENGUNJUNG_GANDA,
  PESAN_PENGUNJUNG_TIDAK_TERDAFTAR,
  PESAN_TANGGAL_LAMPAU,
  PESAN_TIDAK_ADA_AKSES,
  SANDI_DEMO,
  tambahHari,
  type HasilPencarian,
  type PengunjungDto,
  type TiketSaya,
} from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { buatDataPemesanan } from '../db/dataPemesanan.ts'
import { DEMO } from '../db/dataPenerbangan.ts'
import { PROFIL_DEMO } from '../db/dataProfil.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { akun, alokasiKursi, pemesanan, penerbangan, penumpang, profil } from '../db/schema.ts'
import { seed } from '../db/seed.ts'

const HARI_INI = '2026-11-17'
const SEKARANG = new Date('2026-11-17T01:00:00Z') // 08:00 WIB

const TRAVEL = 'travel@cutiterbang.test'
const P1 = 'pengunjung1@cutiterbang.test' // Maya Lestari, profil lengkap
const P2 = 'pengunjung2@cutiterbang.test' // Rizky Hidayat, profil tidak lengkap
const P3 = 'pengunjung3@cutiterbang.test' // Citra Anggraini, profil lengkap

let db: ReturnType<typeof buatDb>
let app: ReturnType<typeof buatApp>
let idKota: Record<string, number>
let idAkun: Record<string, number>

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

const kueri = (isian: Record<string, string | number>) =>
  new URLSearchParams(Object.entries(isian).map(([kunci, nilai]) => [kunci, String(nilai)])).toString()
const cariPengunjung = (cookie: string | undefined, isian: Record<string, string | number>) => kirim(`/travel/cari?${kueri(isian)}`, { cookie })
const pesanUntuk = (cookie: string | undefined, idPenerbangan: unknown, pengunjung: unknown) =>
  kirim('/travel/pemesanan', { body: { idPenerbangan, pengunjung }, cookie })
const tiketDipesankan = async (email: string) => {
  const res = await kirim('/tiket-dipesankan', { cookie: await masuk(email) })
  expect(res.status).toBe(200)
  return ((await res.json()) as { pemesanan: TiketSaya[] }).pemesanan
}
const sisaKursi = async (id: number) => {
  const res = await kirim(`/penerbangan/${id}`)
  return ((await res.json()) as { penerbangan: { sisaKursi: number } }).penerbangan.sisaKursi
}
const idPenerbanganNomor = async (nomor: string, tanggal: string) =>
  (await db.select({ id: penerbangan.id }).from(penerbangan).where(and(eq(penerbangan.nomorPenerbangan, nomor), eq(penerbangan.tanggalKeberangkatan, tanggal))))[0]!.id
const jumlahPemesanan = async () => (await db.select({ n: count() }).from(pemesanan))[0]!.n
const jumlahPenumpang = async () => (await db.select({ n: count() }).from(penumpang))[0]!.n
const jumlahAlokasi = async () => (await db.select({ n: count() }).from(alokasiKursi))[0]!.n

const TANGGAL_PADAT = tambahHari(HARI_INI, DEMO.rutePadat.hariKe)
const TANGGAL_KURSI = tambahHari(HARI_INI, DEMO.kursiTerakhir.hariKe)
const idKursiTerakhir = () => idPenerbanganNomor(DEMO.kursiTerakhir.nomorPenerbangan, TANGGAL_KURSI)
/** Penerbangan rute padat (Jakarta -> Denpasar) menurut pencarian US-8a untuk satu penumpang, urut waktu berangkat. */
const penerbanganPadat = async () => {
  const res = await cariPengunjung(await masuk(TRAVEL), { asal: idKota.Jakarta!, tujuan: idKota.Denpasar!, tanggal: TANGGAL_PADAT, jumlah: 1 })
  return ((await res.json()) as { penerbangan: HasilPencarian[] }).penerbangan
}

// Jumlah di seed: 10 Pemesanan, 12 Penumpang (CTB007 dan CTB009 punya dua), 8 AlokasiKursi (CTB002 dan CTB010 Cancelled tanpa alokasi).
const N_PEMESANAN = 10
const N_PENUMPANG = 12
const N_ALOKASI = 8
beforeEach(async () => {
  db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG })
  const { kota } = (await (await kirim('/penerbangan/kota')).json()) as { kota: { id: number; nama: string }[] }
  idKota = Object.fromEntries(kota.map((k) => [k.nama, k.id]))
  idAkun = Object.fromEntries((await db.select().from(akun)).map((a) => [a.email, a.id]))
})

describe('akses (G12)', () => {
  const RUTE: [string, () => Response | Promise<Response>][] = [
    ['GET /travel/cari', () => cariPengunjung(undefined, {})],
    ['GET /travel/pengunjung', () => kirim('/travel/pengunjung')],
    ['POST /travel/pemesanan', () => pesanUntuk(undefined, 1, [1])],
    ['GET /tiket-dipesankan', () => kirim('/tiket-dipesankan')],
  ]

  test.each(RUTE)('%s tanpa login: 401', async (_nama, panggil) => {
    expect((await panggil()).status).toBe(401)
  })

  test.each(['hrd', 'penumpang', 'member1', 'pengunjung1'])('rute /travel: %s mendapat 403 dengan pesan tanpa akses', async (nama) => {
    const cookie = await masuk(`${nama}@cutiterbang.test`)
    const respons = [
      await cariPengunjung(cookie, { asal: 1, tujuan: 2, tanggal: TANGGAL_PADAT, jumlah: 1 }),
      await kirim('/travel/pengunjung', { cookie }),
      await pesanUntuk(cookie, 1, [idAkun[P1]]),
    ]
    for (const res of respons) {
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
    }
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
  })

  test.each(['hrd', 'penumpang', 'member1', 'travel'])('/tiket-dipesankan: %s mendapat 403', async (nama) => {
    const res = await kirim('/tiket-dipesankan', { cookie: await masuk(`${nama}@cutiterbang.test`) })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
  })

  test('G4: pemesanan Manajer Travel tidak dapat dibatalkan oleh siapa pun lewat /pemesanan/:kode/batalkan', async () => {
    for (const email of [TRAVEL, P1, P3, 'penumpang@cutiterbang.test']) {
      const res = await kirim('/pemesanan/CTB007/batalkan', { method: 'POST', cookie: await masuk(email) })
      expect([403, 404]).toContain(res.status)
    }
    expect((await db.select().from(pemesanan).where(eq(pemesanan.kode, 'CTB007')))[0]!.status).toBe('WaitingForThePayment')
  })
})

describe('US-8a GET /api/travel/cari', () => {
  const sah = () => ({ asal: idKota.Jakarta!, tujuan: idKota.Denpasar!, tanggal: TANGGAL_PADAT, jumlah: 2 })

  test('2a: setiap kolom kosong ditandai, termasuk jumlah penumpang', async () => {
    const cookie = await masuk(TRAVEL)
    const res = await cariPengunjung(cookie, {})
    expect(res.status).toBe(400)
    const { galat } = (await res.json()) as { galat: Record<string, string> }
    expect(Object.keys(galat).sort()).toEqual(['asal', 'jumlah', 'tanggal', 'tujuan'])
    expect(galat.asal).toBe(PESAN_ASAL_WAJIB)
    expect(galat.jumlah).toBe(PESAN_JUMLAH_WAJIB)
    const satu = await cariPengunjung(cookie, { ...sah(), asal: '' })
    expect(((await satu.json()) as { galat: object }).galat).toEqual({ asal: PESAN_ASAL_WAJIB })
  })

  test('2b kota sama dan 2c tanggal sudah lewat', async () => {
    const cookie = await masuk(TRAVEL)
    const sama = await cariPengunjung(cookie, { ...sah(), tujuan: idKota.Jakarta! })
    expect(sama.status).toBe(400)
    expect(((await sama.json()) as { galat: object }).galat).toEqual({ tujuan: PESAN_KOTA_SAMA })
    const lewat = await cariPengunjung(cookie, { ...sah(), tanggal: tambahHari(HARI_INI, -1) })
    expect(lewat.status).toBe(400)
    expect(((await lewat.json()) as { galat: object }).galat).toEqual({ tanggal: PESAN_TANGGAL_LAMPAU })
  })

  test.each(['0', '-2', '1.5', 'dua'])('2d: jumlah "%s" bukan bilangan bulat minimal 1', async (jumlah) => {
    const res = await cariPengunjung(await masuk(TRAVEL), { ...sah(), jumlah })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { galat: object }).galat).toEqual({ jumlah: PESAN_JUMLAH_TIDAK_SAH })
  })

  test('kota yang tidak dikenal ditolak seperti US-3', async () => {
    const res = await cariPengunjung(await masuk(TRAVEL), { ...sah(), asal: 9999 })
    expect(res.status).toBe(400)
    expect(Object.keys(((await res.json()) as { galat: object }).galat)).toEqual(['asal'])
  })

  test('hasil = penerbangan tersedia yang cocok dengan sisaKursi >= jumlah, urut waktu berangkat, tanpa mengubah data', async () => {
    const cookie = await masuk(TRAVEL)
    const semua = await penerbanganPadat()
    expect(semua).toHaveLength(5)
    const kursi = semua.map((f) => f.sisaKursi)
    // jumlah = sisa kursi terbesar: hanya penerbangan dengan kursi sebanyak itu yang cukup
    const jumlah = Math.max(...kursi)
    expect(new Set(kursi).size).toBeGreaterThan(1)
    const res = await cariPengunjung(cookie, { ...sah(), jumlah })
    expect(res.status).toBe(200)
    const { penerbangan: hasil } = (await res.json()) as { penerbangan: HasilPencarian[] }
    expect(hasil.map((f) => f.id)).toEqual(semua.filter((f) => f.sisaKursi >= jumlah).map((f) => f.id))
    expect(hasil.length).toBeGreaterThan(0)
    expect(hasil.length).toBeLessThan(semua.length)
    expect(hasil.map((f) => f.waktuBerangkat)).toEqual([...hasil.map((f) => f.waktuBerangkat)].sort())
    expect(await jumlahAlokasi()).toBe(N_ALOKASI)
  })

  test('penerbangan dengan sisaKursi kurang dari jumlah tidak muncul: rute dua penerbangan satu kursi', async () => {
    const cookie = await masuk(TRAVEL)
    const rute = { asal: idKota[DEMO.kursiTerakhir.asal]!, tujuan: idKota[DEMO.kursiTerakhir.tujuan]!, tanggal: TANGGAL_KURSI }
    // SJ901 sudah terjual (sisa 0), BW902 sisa 1
    const satu = (await (await cariPengunjung(cookie, { ...rute, jumlah: 1 })).json()) as { penerbangan: HasilPencarian[] }
    expect(satu.penerbangan.map((f) => [f.nomorPenerbangan, f.sisaKursi])).toEqual([[DEMO.kursiTerakhir.nomorPenerbangan, 1]])
    const dua = await cariPengunjung(cookie, { ...rute, jumlah: 2 })
    expect(dua.status).toBe(200)
    expect(await dua.json()).toEqual({ penerbangan: [] }) // 3a: Penerbangan tidak ditemukan
  })

  test('penerbangan yang sudah berangkat tidak muncul (G1)', async () => {
    const res = await cariPengunjung(await masuk(TRAVEL), {
      asal: idKota[DEMO.sudahBerangkat.asal]!,
      tujuan: idKota[DEMO.sudahBerangkat.tujuan]!,
      tanggal: HARI_INI,
      jumlah: 1,
    })
    expect(await res.json()).toEqual({ penerbangan: [] })
  })
})

describe('US-8b GET /api/travel/pengunjung', () => {
  test('semua pengunjung terdaftar dengan data Profil dan statusProfil', async () => {
    const res = await kirim('/travel/pengunjung', { cookie: await masuk(TRAVEL) })
    expect(res.status).toBe(200)
    const { pengunjung } = (await res.json()) as { pengunjung: PengunjungDto[] }
    expect(pengunjung.map((v) => [v.nama, v.status])).toEqual([
      ['Citra Anggraini', 'lengkap'],
      ['Maya Lestari', 'lengkap'],
      ['Rizky Hidayat', 'tidakLengkap'],
    ])
    expect(pengunjung.find((v) => v.id === idAkun[P1])!.data).toEqual(PROFIL_DEMO[P1])
    expect(pengunjung.find((v) => v.id === idAkun[P2])!.data.nomorIdentitas).toBeNull()
  })
})

describe('US-8b POST /api/travel/pemesanan (kontrak C2)', () => {
  test('daftar kosong atau bukan daftar: 400 dan tidak ada pemesanan', async () => {
    const cookie = await masuk(TRAVEL)
    const f = (await penerbanganPadat())[0]!
    for (const daftar of [[], undefined, null, 'x', {}]) {
      const res = await pesanUntuk(cookie, f.id, daftar)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ pesan: PESAN_DAFTAR_PENGUNJUNG_KOSONG })
    }
    expect((await kirim('/travel/pemesanan', { method: 'POST', cookie })).status).toBe(400) // tanpa badan
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
  })

  test('G7: pengunjung yang sama dua kali: 400, tidak ada pemesanan dan kursi tetap', async () => {
    const f = (await penerbanganPadat())[0]!
    const res = await pesanUntuk(await masuk(TRAVEL), f.id, [idAkun[P1], idAkun[P3], idAkun[P1]])
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ pesan: PESAN_PENGUNJUNG_GANDA })
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
    expect(await sisaKursi(f.id)).toBe(f.sisaKursi)
  })

  test('daftar kosong didahulukan dari penerbangan yang tidak ada; id yang bukan pengunjung terdaftar: 400', async () => {
    const cookie = await masuk(TRAVEL)
    expect((await pesanUntuk(cookie, 999999, [])).status).toBe(400)
    const f = (await penerbanganPadat())[0]!
    for (const daftar of [[idAkun['member1@cutiterbang.test']], [idAkun[TRAVEL]], [999999], [idAkun[P1], 999999], ['1'], [0]]) {
      const res = await pesanUntuk(cookie, f.id, daftar)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ pesan: PESAN_PENGUNJUNG_TIDAK_TERDAFTAR })
    }
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
  })

  test('urutan: G7 sebelum bentuk id, penerbangan tidak ada (404) sebelum id yang bukan pengunjung', async () => {
    const cookie = await masuk(TRAVEL)
    const f = (await penerbanganPadat())[0]!
    expect(await (await pesanUntuk(cookie, f.id, [idAkun[P1], idAkun[P1], 'x'])).json()).toEqual({ pesan: PESAN_PENGUNJUNG_GANDA })
    for (const daftar of [[idAkun[P1], 'x'], [0]]) expect((await pesanUntuk(cookie, 999999, daftar)).status).toBe(404)
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
  })

  test('penerbangan tidak ada: 404', async () => {
    for (const id of [999999, 'abc', null]) {
      const res = await pesanUntuk(await masuk(TRAVEL), id, [idAkun[P1]])
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN })
    }
  })

  test('5a: profil seorang pengunjung tidak lengkap: 409 menyebut namanya, tidak ada pemesanan dan kursi tetap', async () => {
    const f = (await penerbanganPadat())[0]!
    const res = await pesanUntuk(await masuk(TRAVEL), f.id, [idAkun[P1], idAkun[P2]])
    expect(res.status).toBe(409)
    const { pesan } = (await res.json()) as { pesan: string }
    expect(pesan).toBe('Data profil tidak lengkap: Rizky Hidayat')
    expect(pesan).not.toContain('Maya Lestari')
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
    expect(await jumlahPenumpang()).toBe(N_PENUMPANG)
    expect(await sisaKursi(f.id)).toBe(f.sisaKursi)
  })

  test('5a didahulukan dari 5b: profil tidak lengkap pada penerbangan yang kursinya kurang', async () => {
    const res = await pesanUntuk(await masuk(TRAVEL), await idKursiTerakhir(), [idAkun[P1], idAkun[P2]])
    expect(res.status).toBe(409)
    expect(((await res.json()) as { pesan: string }).pesan).toBe('Data profil tidak lengkap: Rizky Hidayat')
  })

  test('5b: sisa kursi kurang dari jumlah pengunjung: 409 "Kursi sudah habis", tidak ada yang dibuat, kursi tetap', async () => {
    const id = await idKursiTerakhir() // satu kursi, dua pengunjung
    const res = await pesanUntuk(await masuk(TRAVEL), id, [idAkun[P1], idAkun[P3]])
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: PESAN_KURSI_HABIS })
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
    expect(await jumlahPenumpang()).toBe(N_PENUMPANG)
    expect(await jumlahAlokasi()).toBe(N_ALOKASI)
    expect(await sisaKursi(id)).toBe(1)
  })

  test('5b: penerbangan yang sudah berangkat ditolak seperti kursi habis', async () => {
    const id = await idPenerbanganNomor(DEMO.sudahBerangkat.nomorPenerbangan, HARI_INI)
    const res = await pesanUntuk(await masuk(TRAVEL), id, [idAkun[P1]])
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: PESAN_KURSI_HABIS })
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN)
  })

  test('berhasil: satu pemesanan, satu kode, WaitingForThePayment, pemesan = manajer travel, kursi berkurang sebanyak pengunjung', async () => {
    const f = (await penerbanganPadat())[0]!
    const res = await pesanUntuk(await masuk(TRAVEL), f.id, [idAkun[P3], idAkun[P1]])
    expect(res.status).toBe(201)
    const { pemesanan: hasil } = (await res.json()) as { pemesanan: TiketSaya }
    expect(hasil.status).toBe('WaitingForThePayment')
    expect(hasil.label).toBe('Waiting for the payment')
    expect(hasil.kode).toMatch(/^[A-Z2-9]{6}$/)
    expect(hasil.penumpang).toEqual(['Citra Anggraini', 'Maya Lestari'])
    expect(hasil.dapatDibatalkan).toBe(false) // G4
    expect(hasil.penerbangan.id).toBe(f.id)

    expect(await jumlahPemesanan()).toBe(N_PEMESANAN + 1)
    expect(await sisaKursi(f.id)).toBe(f.sisaKursi - 2)
    const [baris] = await db.select().from(pemesanan).where(eq(pemesanan.kode, hasil.kode))
    expect(baris!.pemesanId).toBe(idAkun[TRAVEL])
    expect(baris!.penerbanganId).toBe(f.id)
    expect(baris!.status).toBe('WaitingForThePayment')
    expect(await db.select().from(alokasiKursi).where(eq(alokasiKursi.kodeNormal, hasil.kode.toLowerCase()))).toEqual([
      expect.objectContaining({ jumlah: 2, penerbanganId: f.id }),
    ])
  })

  test('penumpang = salinan data Profil, mewakili setiap pengunjung; kode unik; invarian PesananPengunjung dan DataPenumpangLengkap', async () => {
    const cookie = await masuk(TRAVEL)
    const f = (await penerbanganPadat())[0]!
    const a = (await (await pesanUntuk(cookie, f.id, [idAkun[P1], idAkun[P3]])).json()) as { pemesanan: TiketSaya }
    const b = (await (await pesanUntuk(cookie, f.id, [idAkun[P1]])).json()) as { pemesanan: TiketSaya } // pengunjung boleh ada di pemesanan lain
    expect(a.pemesanan.kode.toLowerCase()).not.toBe(b.pemesanan.kode.toLowerCase())

    const [baris] = await db.select().from(pemesanan).where(eq(pemesanan.kode, a.pemesanan.kode))
    const orang = await db.select().from(penumpang).where(eq(penumpang.pemesananId, baris!.id))
    expect(orang.map((p) => p.akunId).sort()).toEqual([idAkun[P1], idAkun[P3]].sort())
    for (const p of orang) {
      const email = p.akunId === idAkun[P1] ? P1 : P3
      const { namaLengkap, nomorIdentitas, tanggalLahir, nomorTelepon, email: emailData } = p
      expect({ namaLengkap, nomorIdentitas, tanggalLahir, nomorTelepon, email: emailData }).toEqual(PROFIL_DEMO[email])
    }

    const peran = new Map((await db.select().from(akun)).map((x) => [x.id, x.peran]))
    for (const kode of [a.pemesanan.kode, b.pemesanan.kode]) {
      const [m] = await db.select().from(pemesanan).where(eq(pemesanan.kode, kode))
      const daftar = (await db.select().from(penumpang).where(eq(penumpang.pemesananId, m!.id))).map((p) => ({ akunId: p.akunId, data: p }))
      expect(memenuhiPesananPengunjung({ penumpang: daftar }, peran.get(m!.pemesanId)!, (id) => peran.get(id))).toBe(true)
      expect(memenuhiDataPenumpangLengkap({ penumpang: daftar }, HARI_INI)).toBe(true)
    }
  })

  test('data penumpang adalah salinan: mengubah Profil sesudahnya tidak mengubah Penumpang', async () => {
    const f = (await penerbanganPadat())[0]!
    const { pemesanan: hasil } = (await (await pesanUntuk(await masuk(TRAVEL), f.id, [idAkun[P1]])).json()) as { pemesanan: TiketSaya }
    await db.update(profil).set({ namaLengkap: 'Nama Baru' }).where(eq(profil.akunId, idAkun[P1]!))
    const [m] = await db.select().from(pemesanan).where(eq(pemesanan.kode, hasil.kode))
    expect((await db.select().from(penumpang).where(eq(penumpang.pemesananId, m!.id)))[0]!.namaLengkap).toBe('Maya Lestari')
  })

  test('kursi terakhir diperebutkan dua pemesanan serentak: satu berhasil, satu "Kursi sudah habis"', async () => {
    const cookie = await masuk(TRAVEL)
    const id = await idKursiTerakhir()
    const [a, b] = await Promise.all([pesanUntuk(cookie, id, [idAkun[P1]]), pesanUntuk(cookie, id, [idAkun[P3]])])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect(await sisaKursi(id)).toBe(0)
    expect(await jumlahPemesanan()).toBe(N_PEMESANAN + 1)
  })
})

// Pemesanan seed Manajer Travel yang mencantumkan tiap pengunjung, terbaru dulu.
const KODE_SEED: Record<string, string[]> = { [P1]: ['CTB007', 'CTB008', 'CTB009'], [P3]: ['CTB007', 'CTB009'] }

describe('US-8c GET /api/tiket-dipesankan', () => {
  test('pengunjung melihat pemesanan seed yang mencantumkannya: kode, status, informasi penerbangan, tanpa Batalkan', async () => {
    const ctb007 = buatDataPemesanan(HARI_INI).find((p) => p.kode === 'CTB007')!
    for (const email of [P1, P3]) {
      const daftar = await tiketDipesankan(email)
      expect(daftar.map((t) => t.kode)).toEqual(KODE_SEED[email]) // terbaru dulu: CTB007 (1 jam), CTB008 (3 jam), CTB009 (16 jam)
      const tiket = daftar.find((t) => t.kode === 'CTB007')
      expect(tiket).toMatchObject({
        kode: 'CTB007',
        status: 'WaitingForThePayment',
        label: 'Waiting for the payment',
        dapatDibatalkan: false,
        penumpang: ['Maya Lestari', 'Citra Anggraini'],
        eTiket: null,
      })
      expect(tiket!.penerbangan.nomorPenerbangan).toBe(ctb007.nomorPenerbangan)
      expect(tiket!.penerbangan.tanggalKeberangkatan).toBe(ctb007.tanggalKeberangkatan)
    }
  })

  test('2a: pengunjung tanpa pemesanan mendapat daftar kosong', async () => {
    expect(await tiketDipesankan(P2)).toEqual([])
  })

  test('hanya pemesanan yang mencantumkannya: pemesanan untuk orang lain tidak terlihat, yang baru tampil di atas', async () => {
    const cookie = await masuk(TRAVEL)
    const f = (await penerbanganPadat())[0]!
    const hanyaP3 = (await (await pesanUntuk(cookie, f.id, [idAkun[P3]])).json()) as { pemesanan: TiketSaya }
    expect((await tiketDipesankan(P1)).map((t) => t.kode)).toEqual(KODE_SEED[P1]) // P1 tidak dicantumkan pada yang baru
    expect((await tiketDipesankan(P2)).map((t) => t.kode)).toEqual([])
    expect((await tiketDipesankan(P3)).map((t) => t.kode)).toEqual([hanyaP3.pemesanan.kode, ...KODE_SEED[P3]!])

    expect((await pesanUntuk(cookie, f.id, [idAkun[P1]])).status).toBe(201)
    expect(await tiketDipesankan(P1)).toHaveLength(KODE_SEED[P1]!.length + 1)
    expect(await tiketDipesankan(P3)).toHaveLength(KODE_SEED[P3]!.length + 1)
  })

  test('pemesanan milik Calon Penumpang dan Member (seed CTB001 sampai CTB006, CTB010) tidak pernah terlihat', async () => {
    const kode = (await tiketDipesankan(P1)).map((t) => t.kode)
    expect(kode).toEqual(KODE_SEED[P1])
  })
})
