import { beforeEach, describe, expect, test } from 'vitest'
import {
  PESAN_ASAL_TIDAK_DIKENAL,
  PESAN_ASAL_WAJIB,
  PESAN_JUMLAH_SEGMEN,
  PESAN_KOTA_SAMA,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_TANGGAL_LAMPAU,
  PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA,
  PESAN_TIDAK_ADA_AKSES,
  PESAN_TUJUAN_WAJIB,
  SANDI_DEMO,
  tambahHari,
  type HasilPencarian,
} from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { buatDataPenerbangan, DEMO } from '../db/dataPenerbangan.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { seed } from '../db/seed.ts'
import { PESAN_BELUM_MASUK } from '../akses/middleware.ts'

// US-4 POST /api/penerbangan/multi (Member saja, G12).
const HARI_INI = '2026-11-17'
const SEKARANG = new Date('2026-11-17T01:00:00Z') // 08:00 WIB
const DATA = buatDataPenerbangan(HARI_INI)

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
const multi = (cookie: string | undefined, segmen: unknown) => kirim('/penerbangan/multi', { body: { segmen }, cookie })
const seg = (asal: string, tujuan: string, hariKe: number) => ({ asal: String(idKota[asal]), tujuan: String(idKota[tujuan]), tanggal: tambahHari(HARI_INI, hariKe) })
const hasilOk = async (res: Response) => {
  expect(res.status).toBe(200)
  return ((await res.json()) as { segmen: { jumlah: number; penerbangan: HasilPencarian[] }[] }).segmen
}
/** Penerbangan seed sebuah rute pada hari ke-N, harga naik (stabil menurut waktu berangkat). */
const harapan = (asal: string, tujuan: string, hariKe: number) =>
  DATA.penerbangan
    .filter((p) => p.asal === asal && p.tujuan === tujuan && p.tanggalKeberangkatan === tambahHari(HARI_INI, hariKe))
    .sort((a, b) => a.waktuBerangkat.localeCompare(b.waktuBerangkat))
    .sort((a, b) => a.harga - b.harga)

let member: string
beforeEach(async () => {
  const db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG })
  const { kota } = (await (await kirim('/penerbangan/kota')).json()) as { kota: { id: number; nama: string }[] }
  idKota = Object.fromEntries(kota.map((k) => [k.nama, k.id]))
  member = await masuk('member1@cutiterbang.test')
})

describe('POST /api/penerbangan/multi: akses (G12)', () => {
  const dua = () => [seg('Jakarta', 'Denpasar', 3), seg('Denpasar', 'Makassar', 4)]
  test('tanpa login: 401', async () => {
    const res = await multi(undefined, dua())
    expect(res.status).toBe(401)
    expect(((await res.json()) as { pesan: string }).pesan).toBe(PESAN_BELUM_MASUK)
  })
  test.each(['penumpang', 'hrd', 'travel', 'pengunjung1'])('%s: 403 tanpa akses', async (nama) => {
    const res = await multi(await masuk(`${nama}@cutiterbang.test`), dua())
    expect(res.status).toBe(403)
    expect(((await res.json()) as { pesan: string }).pesan).toBe(PESAN_TIDAK_ADA_AKSES)
  })
  test('Member: 200', async () => {
    expect((await multi(member, dua())).status).toBe(200)
  })
})

describe('POST /api/penerbangan/multi: hasil per segmen', () => {
  test('setiap segmen: jumlah dan penerbangan urut harga termurah, harga sama menurut waktu berangkat', async () => {
    const { rutePadat } = DEMO
    const segmen = await hasilOk(await multi(member, [seg(rutePadat.asal, rutePadat.tujuan, rutePadat.hariKe), seg('Denpasar', 'Jakarta', rutePadat.hariKe + 2), seg('Jakarta', 'Surabaya', rutePadat.hariKe + 2)]))
    expect(segmen).toHaveLength(3)
    const rute = [[rutePadat.asal, rutePadat.tujuan, rutePadat.hariKe], ['Denpasar', 'Jakarta', rutePadat.hariKe + 2], ['Jakarta', 'Surabaya', rutePadat.hariKe + 2]] as const
    rute.forEach(([asal, tujuan, hariKe], i) => {
      const f = harapan(asal, tujuan, hariKe)
      expect(f.length).toBeGreaterThanOrEqual(3)
      expect(segmen[i]!.jumlah).toBe(f.length)
      expect(segmen[i]!.penerbangan.map((p) => p.nomorPenerbangan)).toEqual(f.map((p) => p.nomorPenerbangan))
      const harga = segmen[i]!.penerbangan.map((p) => p.harga)
      expect(harga).toEqual([...harga].sort((a, b) => a - b))
    })
  })

  test('baris hasil sama bentuknya dengan US-3 (cari)', async () => {
    const { rutePadat } = DEMO
    const [satu] = await hasilOk(await multi(member, [seg(rutePadat.asal, rutePadat.tujuan, rutePadat.hariKe), seg('Denpasar', 'Makassar', rutePadat.hariKe + 1)]))
    const res = await kirim(`/penerbangan/cari?asal=${idKota[rutePadat.asal]}&tujuan=${idKota[rutePadat.tujuan]}&tanggal=${tambahHari(HARI_INI, rutePadat.hariKe)}`)
    const { penerbangan } = (await res.json()) as { penerbangan: HasilPencarian[] }
    expect([...satu!.penerbangan].sort((a, b) => a.id - b.id)).toEqual([...penerbangan].sort((a, b) => a.id - b.id))
  })

  test('penerbangan habis dan yang sudah berangkat tidak ikut; BW902 (satu kursi) ikut', async () => {
    const { habis, kursiTerakhir, sudahBerangkat } = DEMO
    const [jayapuraMakassar, yogyaSurabaya] = await hasilOk(
      await multi(member, [seg(sudahBerangkat.asal, sudahBerangkat.tujuan, 0), seg(habis.asal, habis.tujuan, habis.hariKe)]),
    )
    expect(yogyaSurabaya!.penerbangan.map((p) => p.nomorPenerbangan)).toEqual([kursiTerakhir.nomorPenerbangan])
    expect(yogyaSurabaya!.penerbangan[0]!.sisaKursi).toBe(1)
    expect(jayapuraMakassar).toEqual({ jumlah: 0, penerbangan: [] }) // G1: PA990 sudah berangkat
  })

  test('4a: segmen tanpa hasil berisi daftar kosong, segmen lain tetap terisi', async () => {
    const { tanpaPenerbangan, rutePadat } = DEMO
    const segmen = await hasilOk(await multi(member, [seg(tanpaPenerbangan.asal, tanpaPenerbangan.tujuan, 2), seg(rutePadat.asal, rutePadat.tujuan, rutePadat.hariKe)]))
    expect(segmen[0]).toEqual({ jumlah: 0, penerbangan: [] })
    expect(segmen[1]!.jumlah).toBeGreaterThan(0)
    expect(PESAN_PENERBANGAN_TIDAK_DITEMUKAN).toBe('Penerbangan tidak ditemukan')
  })

  test('tanggal yang sama pada dua segmen diperbolehkan (3d)', async () => {
    expect((await multi(member, [seg('Jakarta', 'Surabaya', 3), seg('Surabaya', 'Denpasar', 3)])).status).toBe(200)
  })
})

describe('POST /api/penerbangan/multi: validasi (400)', () => {
  const galatDari = async (res: Response) => {
    expect(res.status).toBe(400)
    return ((await res.json()) as { galat: Record<string, string>[] }).galat
  }

  test('3a: kolom kosong pada satu segmen: galat pada indeks itu, segmen lain {}', async () => {
    const galat = await galatDari(await multi(member, [seg('Jakarta', 'Denpasar', 3), { asal: '', tujuan: '', tanggal: tambahHari(HARI_INI, 4) }]))
    expect(galat).toEqual([{}, { asal: PESAN_ASAL_WAJIB, tujuan: PESAN_TUJUAN_WAJIB }])
  })
  test('3b: kota asal sama dengan tujuan', async () => {
    const galat = await galatDari(await multi(member, [seg('Jakarta', 'Jakarta', 3), seg('Jakarta', 'Denpasar', 3)]))
    expect(galat).toEqual([{ tujuan: PESAN_KOTA_SAMA }, {}])
  })
  test('3c: tanggal sudah lewat', async () => {
    const galat = await galatDari(await multi(member, [seg('Jakarta', 'Denpasar', 3), seg('Denpasar', 'Makassar', -1)]))
    expect(galat).toEqual([{}, { tanggal: PESAN_TANGGAL_LAMPAU }])
  })
  test('3d: tanggal lebih awal dari segmen sebelumnya', async () => {
    const galat = await galatDari(await multi(member, [seg('Jakarta', 'Denpasar', 5), seg('Denpasar', 'Makassar', 4)]))
    expect(galat).toEqual([{}, { tanggal: PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA }])
  })
  test('kota tidak dikenal', async () => {
    const galat = await galatDari(await multi(member, [{ ...seg('Jakarta', 'Denpasar', 3), asal: '9999' }, seg('Denpasar', 'Makassar', 4)]))
    expect(galat).toEqual([{ asal: PESAN_ASAL_TIDAK_DIKENAL }, {}])
  })
  test('satu segmen salah menolak seluruh pencarian (tidak ada hasil)', async () => {
    const res = await multi(member, [seg('Jakarta', 'Denpasar', 3), seg('Denpasar', 'Denpasar', 4)])
    expect(res.status).toBe(400)
    expect(await res.json()).not.toHaveProperty('segmen')
  })
  test('jumlah segmen di luar 2 sampai 5 (0, 1, 6) atau bukan daftar: 400 dengan pesan jumlah', async () => {
    const satu = seg('Jakarta', 'Denpasar', 3)
    for (const segmen of [[], [satu], Array(6).fill(satu), 'bukan daftar', undefined]) {
      const res = await multi(member, segmen)
      expect(res.status).toBe(400)
      expect(((await res.json()) as { pesan: string }).pesan).toBe(PESAN_JUMLAH_SEGMEN)
    }
  })
  test('lima segmen diterima', async () => {
    const lima = [seg('Jakarta', 'Surabaya', 3), seg('Surabaya', 'Denpasar', 3), seg('Denpasar', 'Makassar', 4), seg('Makassar', 'Balikpapan', 5), seg('Balikpapan', 'Jakarta', 6)]
    expect((await hasilOk(await multi(member, lima))).length).toBe(5)
  })
  test('isian segmen bukan objek dianggap kosong (3a)', async () => {
    const galat = await galatDari(await multi(member, [null, 5]))
    expect(galat).toHaveLength(2)
    expect(galat[0]).toHaveProperty('asal')
  })
})
