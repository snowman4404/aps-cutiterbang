import { describe, expect, test } from 'vitest'
import {
  cocokDengan,
  DATA_PROFIL_KOSONG,
  PESAN_EMAIL,
  PESAN_KODE_WAJIB,
  PESAN_NAMA_LENGKAP,
  PESAN_NOMOR_IDENTITAS,
  PESAN_NOMOR_TELEPON,
  PESAN_PROFIL_TERSIMPAN,
  PESAN_PROFIL_TIDAK_LENGKAP,
  PESAN_TANGGAL_LAHIR,
  PESAN_TIKET_BELUM_TERKONFIRMASI,
  PESAN_TIKET_SUDAH_TERVALIDASI,
  PESAN_TIKET_TIDAK_COCOK,
  statusProfil,
  validasiIsianKode,
  validasiProfil,
} from './index.ts'

const HARI_INI = '2026-11-17'
const LENGKAP = {
  namaLengkap: 'Sari Dewi',
  nomorIdentitas: '3171010202920002',
  tanggalLahir: '1992-02-02',
  nomorTelepon: '081234567002',
  email: 'sari@contoh.com',
}

describe('statusProfil (/statusProfil)', () => {
  test('lengkap bila kelima kolom terisi dan berformat valid', () => {
    expect(statusProfil(LENGKAP, HARI_INI)).toBe('lengkap')
  })
  test('tidakLengkap bila satu kolom kosong atau null', () => {
    expect(statusProfil({ ...LENGKAP, nomorIdentitas: '' }, HARI_INI)).toBe('tidakLengkap')
    expect(statusProfil({ ...LENGKAP, email: null }, HARI_INI)).toBe('tidakLengkap')
    expect(statusProfil(DATA_PROFIL_KOSONG, HARI_INI)).toBe('tidakLengkap')
  })
  test('tidakLengkap bila ada kolom yang formatnya tidak valid', () => {
    expect(statusProfil({ ...LENGKAP, nomorTelepon: '123' }, HARI_INI)).toBe('tidakLengkap')
  })
  test('tanggal lahir hari ini tidak valid (harus sebelum hari ini)', () => {
    expect(statusProfil({ ...LENGKAP, tanggalLahir: HARI_INI }, HARI_INI)).toBe('tidakLengkap')
  })
})

describe('validasiProfil (US-5a langkah 4, 4a, 5)', () => {
  test('semua kolom valid disimpan dengan nilai di-trim', () => {
    expect(validasiProfil({ ...LENGKAP, namaLengkap: '  Sari Dewi ' }, HARI_INI)).toEqual({ data: LENGKAP })
  })
  test('kolom tidak dikirim, null, kosong, atau spasi saja tersimpan kosong (null) dan tidak dipersoalkan', () => {
    expect(validasiProfil({}, HARI_INI)).toEqual({ data: DATA_PROFIL_KOSONG })
    expect(validasiProfil({ ...LENGKAP, nomorIdentitas: '', email: '   ', tanggalLahir: null }, HARI_INI)).toEqual({
      data: { ...LENGKAP, nomorIdentitas: null, email: null, tanggalLahir: null },
    })
  })
  test('nilai bukan string ditolak dengan frasa kolomnya, tidak diam-diam dikosongkan', () => {
    expect(validasiProfil({ ...LENGKAP, nomorTelepon: 81234567890 }, HARI_INI)).toEqual({ galat: { nomorTelepon: PESAN_NOMOR_TELEPON } })
    expect(validasiProfil({ ...LENGKAP, tanggalLahir: 5, email: true, namaLengkap: ['Sari'] }, HARI_INI)).toEqual({
      galat: { tanggalLahir: PESAN_TANGGAL_LAHIR, email: PESAN_EMAIL, namaLengkap: PESAN_NAMA_LENGKAP },
    })
  })
  test('kolom terisi yang salah format ditolak per kolom dengan frasa spesifikasi', () => {
    const hasil = validasiProfil(
      { namaLengkap: 'x'.repeat(101), nomorIdentitas: '123', tanggalLahir: HARI_INI, nomorTelepon: '12345', email: 'tanpa-at' },
      HARI_INI,
    )
    expect(hasil).toEqual({
      galat: {
        namaLengkap: PESAN_NAMA_LENGKAP,
        nomorIdentitas: PESAN_NOMOR_IDENTITAS,
        tanggalLahir: PESAN_TANGGAL_LAHIR,
        nomorTelepon: PESAN_NOMOR_TELEPON,
        email: PESAN_EMAIL,
      },
    })
  })
  test('satu kolom salah menolak seluruh isian walau kolom lain valid', () => {
    expect(validasiProfil({ ...LENGKAP, nomorIdentitas: '12' }, HARI_INI)).toEqual({ galat: { nomorIdentitas: PESAN_NOMOR_IDENTITAS } })
  })
  test('batas format: nama 100 valid, identitas 16 digit, telepon 10 dan 13 digit', () => {
    expect('data' in validasiProfil({ namaLengkap: 'x'.repeat(100), nomorTelepon: '0812345678' }, HARI_INI)).toBe(true)
    expect('data' in validasiProfil({ nomorTelepon: '0812345678901' }, HARI_INI)).toBe(true)
    expect('galat' in validasiProfil({ nomorTelepon: '08123456789012' }, HARI_INI)).toBe(true)
    expect('galat' in validasiProfil({ nomorIdentitas: '12345678901234567' }, HARI_INI)).toBe(true)
  })
})

describe('US-5b: validasiIsianKode dan cocokDengan', () => {
  test('kode kosong atau bukan string ditolak (2a), kode terisi di-trim', () => {
    expect(validasiIsianKode('')).toEqual({ galat: { kode: PESAN_KODE_WAJIB } })
    expect(validasiIsianKode('   ')).toEqual({ galat: { kode: PESAN_KODE_WAJIB } })
    expect(validasiIsianKode(undefined)).toEqual({ galat: { kode: PESAN_KODE_WAJIB } })
    expect(validasiIsianKode(' ctb005 ')).toEqual({ kode: 'ctb005' })
  })
  const penumpang = [
    { namaLengkap: 'Budi Santoso', nomorIdentitas: '3171010101900001' },
    { namaLengkap: 'Sari Dewi', nomorIdentitas: '3171010202920002' },
  ]
  test('nama tanpa membedakan huruf besar dan kecil, nomor identitas sama persis', () => {
    expect(cocokDengan(penumpang, LENGKAP)).toBe(true)
    expect(cocokDengan(penumpang, { ...LENGKAP, namaLengkap: 'SARI dewi' })).toBe(true)
    expect(cocokDengan(penumpang, { ...LENGKAP, nomorIdentitas: '3171010202920003' })).toBe(false)
    expect(cocokDengan(penumpang, { ...LENGKAP, namaLengkap: 'Sari' })).toBe(false)
  })
  test('nama cocok pada satu penumpang dan identitas pada penumpang lain tidak cocok', () => {
    expect(cocokDengan(penumpang, { namaLengkap: 'Budi Santoso', nomorIdentitas: '3171010202920002' })).toBe(false)
  })
  test('profil kosong atau penumpang kosong tidak cocok', () => {
    expect(cocokDengan(penumpang, DATA_PROFIL_KOSONG)).toBe(false)
    expect(cocokDengan([], LENGKAP)).toBe(false)
  })
  test('pesan sesuai spesifikasi', () => {
    expect(PESAN_PROFIL_TERSIMPAN).toBe('Data profil berhasil disimpan')
    expect(PESAN_PROFIL_TIDAK_LENGKAP).toBe('Data profil tidak lengkap')
    expect(PESAN_TIKET_BELUM_TERKONFIRMASI).toBe('Tiket belum terkonfirmasi')
    expect(PESAN_TIKET_TIDAK_COCOK).toBe('Data tiket tidak cocok dengan data profil')
    expect(PESAN_TIKET_SUDAH_TERVALIDASI).toBe('Tiket sudah tervalidasi')
  })
})
