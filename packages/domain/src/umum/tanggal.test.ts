import { describe, expect, test } from 'vitest'
import { adalahTanggalIso, hariIniWib, pecahTanggalWaktu, tambahHari } from './index.ts'

describe('tanggal', () => {
  test('tambahHari lintas bulan dan tahun', () => {
    expect(tambahHari('2026-12-31', 1)).toBe('2027-01-01')
    expect(tambahHari('2028-02-28', 1)).toBe('2028-02-29')
  })
  test('hariIniWib memakai WIB (UTC+7)', () => {
    expect(hariIniWib(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01')
    expect(hariIniWib(new Date('2026-12-31T10:00:00Z'))).toBe('2026-12-31')
  })
  test('adalahTanggalIso menolak tanggal yang tidak ada di kalender', () => {
    expect(adalahTanggalIso('2026-02-28')).toBe(true)
    expect(adalahTanggalIso('2026-02-30')).toBe(false)
  })
  test('pecahTanggalWaktu memecah komponen; format salah menghasilkan null', () => {
    expect(pecahTanggalWaktu('2026-11-20', '08:30')).toEqual({ tahun: 2026, bulan: 11, hari: 20, jam: 8, menit: 30 })
    expect(pecahTanggalWaktu('2026-11-20', '8:30')).toBeNull()
  })
})
