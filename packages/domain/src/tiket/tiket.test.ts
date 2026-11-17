import { describe, expect, test } from 'vitest'
import {
  cocok,
  PESAN_ASAL_WAJIB,
  PESAN_KOTA_SAMA,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_TANGGAL_LAMPAU,
  PESAN_FORMAT_TANGGAL_KEBERANGKATAN,
  PESAN_TANGGAL_WAJIB,
  PESAN_TUJUAN_WAJIB,
  singkatanZona,
  sisaKursi,
  tersedia,
  urutkanMenurutWaktuBerangkat,
  validasiIsianPencarian,
  waktuBerangkatAbsolut,
  type Kota,
  type Penerbangan,
} from '../index.ts'

const jakarta: Kota = { id: 1, nama: 'Jakarta', zonaWaktu: 'Asia/Jakarta' }
const makassar: Kota = { id: 2, nama: 'Makassar', zonaWaktu: 'Asia/Makassar' }
const jayapura: Kota = { id: 3, nama: 'Jayapura', zonaWaktu: 'Asia/Jayapura' }

const f = (sisa: Partial<Penerbangan> = {}): Penerbangan => ({
  nomorPenerbangan: 'CT100',
  tanggalKeberangkatan: '2026-11-20',
  waktuBerangkat: '08:00',
  waktuTiba: '10:00',
  harga: 1_000_000,
  jumlahKursi: 100,
  asal: jakarta,
  tujuan: makassar,
  ...sisa,
})

describe('waktuBerangkatAbsolut (G1)', () => {
  test('WIB = UTC+7', () => {
    expect(new Date(waktuBerangkatAbsolut(f())).toISOString()).toBe('2026-11-20T01:00:00.000Z')
  })
  test('WITA = UTC+8, WIT = UTC+9', () => {
    expect(new Date(waktuBerangkatAbsolut(f({ asal: makassar }))).toISOString()).toBe('2026-11-20T00:00:00.000Z')
    expect(new Date(waktuBerangkatAbsolut(f({ asal: jayapura }))).toISOString()).toBe('2026-11-19T23:00:00.000Z')
  })
  test('format salah menghasilkan NaN', () => {
    expect(waktuBerangkatAbsolut(f({ waktuBerangkat: 'x' }))).toBeNaN()
  })
})

describe('sisaKursi dan tersedia', () => {
  test('sisaKursi = jumlahKursi - penumpang aktif', () => {
    expect(sisaKursi(100, 40)).toBe(60)
    expect(sisaKursi(100, 100)).toBe(0)
  })
  const sebelum = new Date('2026-11-20T00:59:00Z') // 07:59 WIB
  const sesudah = new Date('2026-11-20T01:01:00Z') // 08:01 WIB
  test('belum berangkat dan masih ada kursi', () => {
    expect(tersedia(f(), sebelum, 99)).toBe(true)
  })
  test('sudah berangkat: tidak tersedia', () => {
    expect(tersedia(f(), sesudah, 0)).toBe(false)
  })
  test('kursi habis: tidak tersedia', () => {
    expect(tersedia(f(), sebelum, 100)).toBe(false)
  })
  test('G1: Jayapura 00:00 WIT tanggal D sudah berangkat pada D 00:30 WIB (berangkat D-1 22:00 WIB)', () => {
    const jp = f({ asal: jayapura, tujuan: makassar, tanggalKeberangkatan: '2026-11-17', waktuBerangkat: '00:00' })
    expect(new Date(waktuBerangkatAbsolut(jp)).toISOString()).toBe('2026-11-16T15:00:00.000Z') // 22:00 WIB tgl 16
    const pukul0030Wib = new Date('2026-11-16T17:30:00Z') // 17 Nov 00:30 WIB
    expect(tersedia(jp, pukul0030Wib, 0)).toBe(false)
  })
})

describe('cocok', () => {
  const sekarang = new Date('2026-11-17T00:00:00Z')
  const k = { asalId: 1, tujuanId: 2, tanggal: '2026-11-20' }
  test('semua kriteria terpenuhi', () => {
    expect(cocok(f(), k, sekarang, 0)).toBe(true)
  })
  test.each([
    ['asal beda', { ...k, asalId: 3 }],
    ['tujuan beda', { ...k, tujuanId: 3 }],
    ['tanggal beda', { ...k, tanggal: '2026-11-21' }],
  ])('%s: tidak cocok', (_n, kr) => {
    expect(cocok(f(), kr, sekarang, 0)).toBe(false)
  })
  test('tidak tersedia: tidak cocok', () => {
    expect(cocok(f(), k, sekarang, 100)).toBe(false)
  })
})

describe('urutkanMenurutWaktuBerangkat', () => {
  test('urut instan keberangkatan naik, tidak mengubah masukan', () => {
    const masukan = [
      f({ nomorPenerbangan: 'B', waktuBerangkat: '15:00' }),
      f({ nomorPenerbangan: 'A', waktuBerangkat: '06:30' }),
      f({ nomorPenerbangan: 'C', waktuBerangkat: '11:00' }),
    ]
    expect(urutkanMenurutWaktuBerangkat(masukan).map((x) => x.nomorPenerbangan)).toEqual(['A', 'C', 'B'])
    expect(masukan.map((x) => x.nomorPenerbangan)).toEqual(['B', 'A', 'C'])
  })
})

describe('validasiIsianPencarian', () => {
  const HARI_INI = '2026-11-17'
  test('valid: kosong, hari ini boleh', () => {
    expect(validasiIsianPencarian({ asal: '1', tujuan: '2', tanggal: HARI_INI }, HARI_INI)).toEqual({})
  })
  test('3a: kolom kosong ditandai', () => {
    expect(validasiIsianPencarian({}, HARI_INI)).toEqual({
      asal: PESAN_ASAL_WAJIB,
      tujuan: PESAN_TUJUAN_WAJIB,
      tanggal: PESAN_TANGGAL_WAJIB,
    })
  })
  test('3b: asal sama dengan tujuan', () => {
    expect(validasiIsianPencarian({ asal: '1', tujuan: '1', tanggal: HARI_INI }, HARI_INI)).toEqual({
      tujuan: PESAN_KOTA_SAMA,
    })
  })
  test('3c: tanggal sudah lewat', () => {
    expect(validasiIsianPencarian({ asal: '1', tujuan: '2', tanggal: '2026-11-16' }, HARI_INI)).toEqual({
      tanggal: PESAN_TANGGAL_LAMPAU,
    })
  })
  test('format tanggal tidak valid', () => {
    expect(validasiIsianPencarian({ asal: '1', tujuan: '2', tanggal: '2026-02-30' }, HARI_INI)).toEqual({
      tanggal: PESAN_FORMAT_TANGGAL_KEBERANGKATAN,
    })
  })
})

test('zona dan pesan', () => {
  expect(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'].map(singkatanZona)).toEqual(['WIB', 'WITA', 'WIT'])
  expect(PESAN_PENERBANGAN_TIDAK_DITEMUKAN).toBe('Penerbangan tidak ditemukan')
})
