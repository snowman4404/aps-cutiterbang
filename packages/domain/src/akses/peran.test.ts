import { describe, expect, test } from 'vitest'
import { DAFTAR_PERAN, punyaPeran } from './peran.ts'

describe('punyaPeran', () => {
  test('peran yang sama diizinkan', () => {
    expect(punyaPeran('HRDManajer', ['HRDManajer'])).toBe(true)
  })

  test('peran yang tidak terdaftar ditolak', () => {
    expect(punyaPeran('CalonPenumpang', ['HRDManajer'])).toBe(false)
    expect(punyaPeran('Pengunjung', ['ManajerTravel', 'HRDManajer'])).toBe(false)
  })

  test('MemberFrequentTraveller juga memenuhi CalonPenumpang', () => {
    expect(punyaPeran('MemberFrequentTraveller', ['CalonPenumpang'])).toBe(true)
  })

  test('CalonPenumpang tidak memenuhi MemberFrequentTraveller', () => {
    expect(punyaPeran('CalonPenumpang', ['MemberFrequentTraveller'])).toBe(false)
  })

  test('peran lain tidak mewarisi apa pun', () => {
    for (const p of DAFTAR_PERAN) {
      if (p === 'MemberFrequentTraveller' || p === 'CalonPenumpang') continue
      expect(punyaPeran(p, ['CalonPenumpang'])).toBe(false)
    }
  })

  test('daftar kosong menolak semua', () => {
    for (const p of DAFTAR_PERAN) expect(punyaPeran(p, [])).toBe(false)
  })
})
