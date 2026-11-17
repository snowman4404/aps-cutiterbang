import { describe, expect, test } from 'vitest'
import { validasiPendaftaran } from './pendaftaran.ts'

const valid = {
  nama: 'Budi',
  email: 'budi@contoh.com',
  kataSandi: 'rahasia123',
  peran: 'CalonPenumpang',
}

describe('validasiPendaftaran', () => {
  test('data valid tidak menghasilkan galat', () => {
    expect(validasiPendaftaran(valid)).toEqual({})
    expect(validasiPendaftaran({ ...valid, peran: 'MemberFrequentTraveller' })).toEqual({})
  })

  test('nama kosong atau hanya spasi ditolak', () => {
    expect(validasiPendaftaran({ ...valid, nama: '' }).nama).toBeDefined()
    expect(validasiPendaftaran({ ...valid, nama: '   ' }).nama).toBeDefined()
  })

  test('nama lebih dari 100 karakter ditolak, tepat 100 diterima', () => {
    expect(validasiPendaftaran({ ...valid, nama: 'a'.repeat(101) }).nama).toBeDefined()
    expect(validasiPendaftaran({ ...valid, nama: 'a'.repeat(100) }).nama).toBeUndefined()
  })

  test('email harus berbentuk nama@domain', () => {
    for (const email of ['', 'budi', 'budi@', '@contoh.com', 'budi@contoh', 'bu di@contoh.com']) {
      expect(validasiPendaftaran({ ...valid, email }).email).toBeDefined()
    }
  })

  test('kata sandi minimal 8 karakter', () => {
    expect(validasiPendaftaran({ ...valid, kataSandi: '1234567' }).kataSandi).toBeDefined()
    expect(validasiPendaftaran({ ...valid, kataSandi: '12345678' }).kataSandi).toBeUndefined()
  })

  test('peran hanya CalonPenumpang atau MemberFrequentTraveller', () => {
    for (const peran of ['HRDManajer', 'ManajerTravel', 'Pengunjung', '', 'x']) {
      expect(validasiPendaftaran({ ...valid, peran }).peran).toBeDefined()
    }
  })

  test('beberapa galat sekaligus', () => {
    const galat = validasiPendaftaran({ nama: '', email: 'x', kataSandi: 'a', peran: 'x' })
    expect(Object.keys(galat).sort()).toEqual(['email', 'kataSandi', 'nama', 'peran'])
  })
})
