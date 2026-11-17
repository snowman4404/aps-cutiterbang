import { describe, expect, test } from 'vitest'
import {
  PESAN_FORMAT_JAM,
  PESAN_JAM_AKHIR_SEBELUM_AWAL,
  PESAN_JAM_WAJIB,
  saringMenurutWaktuBerangkat,
  validasiIsianJam,
} from '../index.ts'

describe('US-6a validasiIsianJam', () => {
  test('rentang sah: tanpa galat, termasuk jam sama dan batas 00:00 / 23:59', () => {
    expect(validasiIsianJam('06:00', '12:00')).toEqual({})
    expect(validasiIsianJam('08:30', '08:30')).toEqual({})
    expect(validasiIsianJam('00:00', '23:59')).toEqual({})
  })
  test('3a: salah satu atau keduanya kosong menandai kolom yang kosong', () => {
    expect(validasiIsianJam('', '12:00')).toEqual({ jamAwal: PESAN_JAM_WAJIB })
    expect(validasiIsianJam('06:00', '')).toEqual({ jamAkhir: PESAN_JAM_WAJIB })
    expect(validasiIsianJam('', '')).toEqual({ jamAwal: PESAN_JAM_WAJIB, jamAkhir: PESAN_JAM_WAJIB })
    expect(validasiIsianJam('  ', '12:00')).toEqual({ jamAwal: PESAN_JAM_WAJIB })
  })
  test('3b: jam akhir lebih awal dari jam awal ditolak pada jam akhir', () => {
    expect(validasiIsianJam('12:00', '11:59')).toEqual({ jamAkhir: PESAN_JAM_AKHIR_SEBELUM_AWAL })
    expect(validasiIsianJam('23:59', '00:00')).toEqual({ jamAkhir: PESAN_JAM_AKHIR_SEBELUM_AWAL })
  })
  test('format harus HH:MM 24 jam', () => {
    for (const salah of ['24:00', '7:30', '12:60', '12.30', 'abc', '1230']) {
      expect(validasiIsianJam(salah, '23:59')).toEqual({ jamAwal: PESAN_FORMAT_JAM })
    }
  })
})

describe('US-6a saringMenurutWaktuBerangkat', () => {
  const daftar = ['00:00', '06:00', '08:30', '11:15', '14:00', '17:30', '23:59'].map((waktuBerangkat, id) => ({ id, waktuBerangkat }))
  const jam = (hasil: { waktuBerangkat: string }[]) => hasil.map((f) => f.waktuBerangkat)

  test('kedua batas ikut dihitung, urutan masukan dipertahankan', () => {
    expect(jam(saringMenurutWaktuBerangkat(daftar, '06:00', '14:00'))).toEqual(['06:00', '08:30', '11:15', '14:00'])
  })
  test('batas harian 00:00 dan 23:59', () => {
    expect(jam(saringMenurutWaktuBerangkat(daftar, '00:00', '00:00'))).toEqual(['00:00'])
    expect(jam(saringMenurutWaktuBerangkat(daftar, '23:59', '23:59'))).toEqual(['23:59'])
    expect(saringMenurutWaktuBerangkat(daftar, '00:00', '23:59')).toHaveLength(daftar.length)
  })
  test('4a: tidak ada yang cocok memberi daftar kosong; masukan tidak berubah', () => {
    expect(saringMenurutWaktuBerangkat(daftar, '12:00', '13:00')).toEqual([])
    expect(daftar).toHaveLength(7)
  })
})
