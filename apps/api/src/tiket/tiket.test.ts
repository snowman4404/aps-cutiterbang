import { beforeEach, describe, expect, test } from 'vitest'
import {
  PESAN_ASAL_TIDAK_DIKENAL,
  PESAN_ASAL_WAJIB,
  PESAN_KOTA_SAMA,
  PESAN_TANGGAL_LAMPAU,
  PESAN_TANGGAL_WAJIB,
  PESAN_TUJUAN_WAJIB,
  tambahHari,
} from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { buatDataPenerbangan, DEMO, KOTA } from '../db/dataPenerbangan.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { resetData } from '../db/reset.ts'
import { seed } from '../db/seed.ts'

const HARI_INI = '2026-11-17'
const SEKARANG = new Date('2026-11-17T01:00:00Z') // 08:00 WIB

let app: ReturnType<typeof buatApp>
let idKota: Record<string, number>

interface Hasil {
  id: number
  maskapai: string
  nomorPenerbangan: string
  asal: { id: number; nama: string; zonaWaktu: string }
  tujuan: { id: number; nama: string; zonaWaktu: string }
  tanggalKeberangkatan: string
  waktuBerangkat: string
  waktuTiba: string
  harga: number
  sisaKursi: number
}

const ambil = (path: string) => app.request(`/api/penerbangan${path}`)
const cari = (asal: string | number, tujuan: string | number, tanggal: string) =>
  ambil(`/cari?asal=${asal}&tujuan=${tujuan}&tanggal=${tanggal}`)
const cariNama = async (asal: string, tujuan: string, tanggal: string) => {
  const res = await cari(idKota[asal]!, idKota[tujuan]!, tanggal)
  expect(res.status).toBe(200)
  return ((await res.json()) as { penerbangan: Hasil[] }).penerbangan
}

beforeEach(async () => {
  const db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG })
  const { kota } = (await (await ambil('/kota')).json()) as { kota: { id: number; nama: string }[] }
  idKota = Object.fromEntries(kota.map((k) => [k.nama, k.id]))
})

describe('GET /api/penerbangan/kota', () => {
  test('tanpa login: semua kota urut nama dengan zona waktu', async () => {
    const res = await ambil('/kota')
    expect(res.status).toBe(200)
    const { kota } = (await res.json()) as { kota: { nama: string; zonaWaktu: string }[] }
    expect(kota.map((k) => k.nama)).toEqual(KOTA.map((k) => k.nama).sort())
    expect(kota.find((k) => k.nama === 'Jayapura')!.zonaWaktu).toBe('Asia/Jayapura')
    expect(kota.find((k) => k.nama === 'Denpasar')!.zonaWaktu).toBe('Asia/Makassar')
  })
})

describe('GET /api/penerbangan/cari: validasi', () => {
  test('3a: semua kolom kosong: 400 dengan galat per kolom', async () => {
    const res = await ambil('/cari')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      galat: { asal: PESAN_ASAL_WAJIB, tujuan: PESAN_TUJUAN_WAJIB, tanggal: PESAN_TANGGAL_WAJIB },
    })
  })

  test('3a: satu kolom kosong ditandai', async () => {
    const res = await cari(idKota.Jakarta!, idKota.Denpasar!, '')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { tanggal: PESAN_TANGGAL_WAJIB } })
  })

  test('3b: asal sama dengan tujuan: 400 pada kolom tujuan', async () => {
    const res = await cari(idKota.Jakarta!, idKota.Jakarta!, HARI_INI)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { tujuan: PESAN_KOTA_SAMA } })
  })

  test('3c: tanggal sudah lewat: 400 pada kolom tanggal; hari ini diperbolehkan', async () => {
    const res = await cari(idKota.Jakarta!, idKota.Denpasar!, tambahHari(HARI_INI, -1))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { tanggal: PESAN_TANGGAL_LAMPAU } })
    expect((await cari(idKota.Jakarta!, idKota.Denpasar!, HARI_INI)).status).toBe(200)
  })

  test('kota tidak dikenal: galat pada kolom itu', async () => {
    const res = await cari(9999, idKota.Denpasar!, HARI_INI)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { asal: PESAN_ASAL_TIDAK_DIKENAL } })
  })
})

describe('GET /api/penerbangan/cari: hasil (US-3)', () => {
  test('tanpa login, urut waktu berangkat naik walau urutan seed berbeda', async () => {
    const { rutePadat } = DEMO
    const tanggal = tambahHari(HARI_INI, rutePadat.hariKe)
    const urutanSeed = buatDataPenerbangan(HARI_INI)
      .penerbangan.filter(
        (p) => p.asal === rutePadat.asal && p.tujuan === rutePadat.tujuan && p.tanggalKeberangkatan === tanggal,
      )
      .map((p) => p.waktuBerangkat)
    expect(urutanSeed.length).toBeGreaterThanOrEqual(3)
    expect(urutanSeed).not.toEqual([...urutanSeed].sort())

    const hasil = await cariNama(rutePadat.asal, rutePadat.tujuan, tanggal)
    expect(hasil.map((h) => h.waktuBerangkat)).toEqual([...urutanSeed].sort())
    expect(new Set(hasil.map((h) => h.harga)).size).toBeGreaterThan(1)
    for (const h of hasil) {
      expect(h.asal.nama).toBe('Jakarta')
      expect(h.tujuan.nama).toBe('Denpasar')
      expect(h.tanggalKeberangkatan).toBe(tanggal)
      expect(h.sisaKursi).toBeGreaterThan(0)
      expect(h.maskapai).toBeTruthy()
    }
  })

  test('penerbangan yang sudah berangkat hari ini tidak ditawarkan', async () => {
    // Sekarang 08:00 WIB: Jakarta -> Surabaya 06:00 sudah berangkat, 08:30 belum.
    const hasil = await cariNama('Jakarta', 'Surabaya', HARI_INI)
    expect(hasil.map((h) => h.waktuBerangkat)).not.toContain('06:00')
    expect(hasil[0]!.waktuBerangkat).toBe('08:30')
  })

  test('G1: Jayapura 00:00 WIT hari ini sudah berangkat menurut WIB: tidak ditawarkan', async () => {
    const { sudahBerangkat } = DEMO
    const semua = buatDataPenerbangan(HARI_INI).penerbangan.filter(
      (p) => p.asal === sudahBerangkat.asal && p.tujuan === sudahBerangkat.tujuan && p.tanggalKeberangkatan === HARI_INI,
    )
    expect(semua.map((p) => p.nomorPenerbangan)).toEqual([sudahBerangkat.nomorPenerbangan])
    expect(await cariNama(sudahBerangkat.asal, sudahBerangkat.tujuan, HARI_INI)).toEqual([])
    // Hari berikutnya rute yang sama tetap tersedia.
    expect((await cariNama(sudahBerangkat.asal, sudahBerangkat.tujuan, tambahHari(HARI_INI, 1))).length).toBeGreaterThan(0)
  })

  test('lintas zona: waktu berangkat lokal di asal, waktu tiba lokal di tujuan', async () => {
    const { lintasZona } = DEMO
    const hasil = await cariNama(lintasZona.asal, lintasZona.tujuan, tambahHari(HARI_INI, lintasZona.hariKe))
    expect(hasil.length).toBeGreaterThan(0)
    expect(hasil[0]!.asal.zonaWaktu).toBe('Asia/Jakarta')
    expect(hasil[0]!.tujuan.zonaWaktu).toBe('Asia/Jayapura')
    // 07:30 WIB + 5 jam 30 menit terbang = 13:00 WIB = 15:00 WIT.
    expect(hasil[0]!.waktuBerangkat).toBe('07:30')
    expect(hasil[0]!.waktuTiba).toBe('15:00')
  })

  test('tidak ada yang cocok: daftar kosong (web menampilkan "Penerbangan tidak ditemukan")', async () => {
    const { tanpaPenerbangan } = DEMO
    expect(await cariNama(tanpaPenerbangan.asal, tanpaPenerbangan.tujuan, tambahHari(HARI_INI, 2))).toEqual([])
  })

  test('tanggal di luar jangkauan seed: daftar kosong', async () => {
    expect(await cariNama('Jakarta', 'Denpasar', tambahHari(HARI_INI, 200))).toEqual([])
  })
})

describe('seed', () => {
  test('idempoten dan resetData memulihkan katalog', async () => {
    const db = buatDb(':memory:')
    await jalankanMigrasi(db)
    await seed(db, HARI_INI)
    await seed(db, HARI_INI)
    await resetData(db)
    const a = buatApp(db, { hariIni: HARI_INI, sekarang: () => SEKARANG })
    const res = await a.request('/api/penerbangan/kota')
    expect(((await res.json()) as { kota: unknown[] }).kota).toHaveLength(KOTA.length)
  })
})
