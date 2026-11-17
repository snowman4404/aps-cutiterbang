import { describe, expect, test } from 'vitest'
import { validasiPendaftaran, type DataPendaftaran, type GalatPendaftaran } from './pendaftaran.ts'

// Galat per kolom (kosong = valid).
const galatDari = (data: DataPendaftaran): GalatPendaftaran => {
  const hasil = validasiPendaftaran(data)
  return hasil.ok ? {} : hasil.galat
}

const valid = {
  nama: 'Budi',
  email: 'budi@contoh.com',
  kataSandi: 'rahasia123',
  peran: 'CalonPenumpang',
}

describe('validasiPendaftaran', () => {
  test('data valid tidak menghasilkan galat', () => {
    expect(galatDari(valid)).toEqual({})
    expect(galatDari({ ...valid, peran: 'MemberFrequentTraveller' })).toEqual({})
  })

  test('hasil sah: peran menyempit ke PeranPendaftaran, nama dan email dirapikan', () => {
    const hasil = validasiPendaftaran({
      ...valid,
      nama: '  Budi  ',
      email: ' budi@contoh.com ',
      peran: 'MemberFrequentTraveller',
    })
    expect(hasil).toEqual({
      ok: true,
      data: { nama: 'Budi', email: 'budi@contoh.com', kataSandi: 'rahasia123', peran: 'MemberFrequentTraveller' },
    })
  })

  test('nama kosong atau hanya spasi ditolak', () => {
    expect(galatDari({ ...valid, nama: '' }).nama).toBeDefined()
    expect(galatDari({ ...valid, nama: '   ' }).nama).toBeDefined()
  })

  test('nama lebih dari 100 karakter ditolak, tepat 100 diterima', () => {
    expect(galatDari({ ...valid, nama: 'a'.repeat(101) }).nama).toBeDefined()
    expect(galatDari({ ...valid, nama: 'a'.repeat(100) }).nama).toBeUndefined()
  })

  test('email harus berbentuk nama@domain', () => {
    for (const email of ['', 'budi', 'budi@', '@contoh.com', 'budi@contoh', 'bu di@contoh.com']) {
      expect(galatDari({ ...valid, email }).email).toBeDefined()
    }
  })

  test('kata sandi minimal 8 karakter', () => {
    expect(galatDari({ ...valid, kataSandi: '1234567' }).kataSandi).toBeDefined()
    expect(galatDari({ ...valid, kataSandi: '12345678' }).kataSandi).toBeUndefined()
  })

  test('peran hanya CalonPenumpang atau MemberFrequentTraveller', () => {
    for (const peran of ['HRDManajer', 'ManajerTravel', 'Pengunjung', '', 'x']) {
      expect(galatDari({ ...valid, peran }).peran).toBeDefined()
    }
  })

  test('beberapa galat sekaligus', () => {
    const galat = galatDari({ nama: '', email: 'x', kataSandi: 'a', peran: 'x' })
    expect(Object.keys(galat).sort()).toEqual(['email', 'kataSandi', 'nama', 'peran'])
  })
})
