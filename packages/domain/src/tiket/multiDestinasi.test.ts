import { describe, expect, test } from 'vitest'
import {
  adaGalatSegmen,
  bolehHapusSegmen,
  bolehTambahSegmen,
  jumlahSegmenSah,
  PESAN_ASAL_WAJIB,
  PESAN_KOTA_SAMA,
  PESAN_TANGGAL_LAMPAU,
  PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA,
  PESAN_TANGGAL_WAJIB,
  PESAN_TUJUAN_WAJIB,
  urutkanDariHargaTermurah,
  validasiSetiapSegmen,
  type Segmen,
} from '../index.ts'

const HARI_INI = '2026-11-17'
const segmen = (asal: string, tujuan: string, tanggal: string): Segmen => ({ asal, tujuan, tanggal })

describe('US-4 jumlah segmen (2a, 2b)', () => {
  test('2a: menambah sampai 5 segmen, tidak lebih', () => {
    expect([1, 2, 3, 4, 5, 6].map(bolehTambahSegmen)).toEqual([true, true, true, true, false, false])
  })
  test('2b: menghapus hanya selama masih tersisa 2 segmen setelahnya', () => {
    expect([2, 3, 4, 5].map(bolehHapusSegmen)).toEqual([false, true, true, true])
  })
  test('jumlah sah 2 sampai 5', () => {
    expect([0, 1, 2, 5, 6].map(jumlahSegmenSah)).toEqual([false, false, true, true, false])
  })
})

describe('validasiSetiapSegmen', () => {
  test('semua segmen valid: tidak ada galat', () => {
    const galat = validasiSetiapSegmen([segmen('1', '2', '2026-12-01'), segmen('2', '3', '2026-12-05')], HARI_INI)
    expect(galat).toEqual([{}, {}])
    expect(adaGalatSegmen(galat)).toBe(false)
  })

  test('3a: kolom kosong ditandai pada segmen yang bersangkutan saja', () => {
    const galat = validasiSetiapSegmen([segmen('1', '2', '2026-12-01'), segmen('', '', '')], HARI_INI)
    expect(galat[0]).toEqual({})
    expect(galat[1]).toEqual({ asal: PESAN_ASAL_WAJIB, tujuan: PESAN_TUJUAN_WAJIB, tanggal: PESAN_TANGGAL_WAJIB })
    expect(adaGalatSegmen(galat)).toBe(true)
  })

  test('3b: kota asal sama dengan tujuan pada segmen mana pun (id 1 dan 01 sama)', () => {
    const galat = validasiSetiapSegmen([segmen('1', '2', '2026-12-01'), segmen('3', '03', '2026-12-02')], HARI_INI)
    expect(galat[0]).toEqual({})
    expect(galat[1]).toEqual({ tujuan: PESAN_KOTA_SAMA })
  })

  test('3c: tanggal lampau ditolak, hari ini diperbolehkan', () => {
    const galat = validasiSetiapSegmen([segmen('1', '2', '2026-11-16'), segmen('2', '3', HARI_INI)], HARI_INI)
    expect(galat[0]).toEqual({ tanggal: PESAN_TANGGAL_LAMPAU })
    expect(galat[1]).toEqual({})
  })

  test('3d: tanggal lebih awal dari segmen sebelumnya ditolak pada segmen itu', () => {
    const galat = validasiSetiapSegmen(
      [segmen('1', '2', '2026-12-05'), segmen('2', '3', '2026-12-04'), segmen('3', '4', '2026-12-10')],
      HARI_INI,
    )
    expect(galat).toEqual([{}, { tanggal: PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA }, {}])
  })

  test('3d: tanggal yang sama dengan segmen sebelumnya diperbolehkan', () => {
    const galat = validasiSetiapSegmen([segmen('1', '2', '2026-12-05'), segmen('2', '3', '2026-12-05')], HARI_INI)
    expect(adaGalatSegmen(galat)).toBe(false)
  })

  test('3d dibandingkan dengan segmen langsung sebelumnya, bukan yang terawal', () => {
    const galat = validasiSetiapSegmen(
      [segmen('1', '2', '2026-12-10'), segmen('2', '3', '2026-12-12'), segmen('3', '4', '2026-12-11')],
      HARI_INI,
    )
    expect(galat).toEqual([{}, {}, { tanggal: PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA }])
  })

  test('3d tidak menimpa galat tanggal lain dan dilewati bila tanggal sebelumnya kosong', () => {
    const galat = validasiSetiapSegmen(
      [segmen('1', '2', ''), segmen('2', '3', '2026-11-01'), segmen('3', '4', '2026-12-01')],
      HARI_INI,
    )
    expect(galat[0]).toEqual({ tanggal: PESAN_TANGGAL_WAJIB })
    expect(galat[1]).toEqual({ tanggal: PESAN_TANGGAL_LAMPAU }) // 3c menang atas 3d
    expect(galat[2]).toEqual({}) // 1 Des tidak lebih awal dari 1 Nov
  })

  test('satu segmen salah menolak seluruh pencarian; segmen lain tetap tanpa galat', () => {
    const galat = validasiSetiapSegmen(
      [segmen('1', '2', '2026-12-01'), segmen('2', '2', '2026-12-02'), segmen('2', '3', '2026-12-03')],
      HARI_INI,
    )
    expect(adaGalatSegmen(galat)).toBe(true)
    expect(galat.map((g) => Object.keys(g).length)).toEqual([0, 1, 0])
  })

  test('isian bukan string dianggap kosong', () => {
    const galat = validasiSetiapSegmen([{ asal: 5, tujuan: null, tanggal: undefined }], HARI_INI)
    expect(galat[0]).toEqual({ asal: PESAN_ASAL_WAJIB, tujuan: PESAN_TUJUAN_WAJIB, tanggal: PESAN_TANGGAL_WAJIB })
  })
})

describe('urutkanDariHargaTermurah', () => {
  test('harga naik, harga sama menurut urutan masukan, masukan tidak berubah', () => {
    const masukan = [
      { id: 1, harga: 900 },
      { id: 2, harga: 500 },
      { id: 3, harga: 900 },
      { id: 4, harga: 700 },
      { id: 5, harga: 500 },
    ]
    const salinan = structuredClone(masukan)
    expect(urutkanDariHargaTermurah(masukan).map((f) => f.id)).toEqual([2, 5, 4, 1, 3])
    expect(masukan).toEqual(salinan)
  })
  test('daftar kosong tetap kosong', () => {
    expect(urutkanDariHargaTermurah([])).toEqual([])
  })
})
