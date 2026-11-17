import { describe, expect, test } from 'vitest'
import {
  jumlahDariTeks,
  memenuhiPesananPengunjung,
  PESAN_ASAL_WAJIB,
  PESAN_DAFTAR_PENGUNJUNG_KOSONG,
  PESAN_JUMLAH_TIDAK_SAH,
  PESAN_JUMLAH_WAJIB,
  PESAN_KOTA_SAMA,
  PESAN_PENGUNJUNG_GANDA,
  PESAN_PENGUNJUNG_TIDAK_TERDAFTAR,
  PESAN_TANGGAL_LAMPAU,
  pesanProfilTidakLengkap,
  salinDataProfil,
  saringSisaKursi,
  validasiDaftarPengunjung,
  idPengunjungDari,
  validasiIsianPencarianPengunjung,
  validasiJumlahPenumpang,
  DATA_PROFIL_KOSONG,
  type DataProfil,
  type Peran,
} from '../index.ts'

const HARI_INI = '2026-11-18'
const SAH = { asal: '1', tujuan: '2', tanggal: '2026-11-20', jumlah: '2' }

describe('US-8a validasi isian (2a sampai 2d)', () => {
  test('isian sah tidak punya galat', () => {
    expect(validasiIsianPencarianPengunjung(SAH, HARI_INI)).toEqual({})
  })

  test('2a kolom kosong, termasuk jumlah penumpang', () => {
    expect(validasiIsianPencarianPengunjung({ ...SAH, asal: '', jumlah: '' }, HARI_INI)).toEqual({
      asal: PESAN_ASAL_WAJIB,
      jumlah: PESAN_JUMLAH_WAJIB,
    })
    expect(validasiIsianPencarianPengunjung({}, HARI_INI).jumlah).toBe(PESAN_JUMLAH_WAJIB)
  })

  test('2b kota sama dan 2c tanggal lewat memakai pesan US-3', () => {
    expect(validasiIsianPencarianPengunjung({ ...SAH, tujuan: '1' }, HARI_INI).tujuan).toBe(PESAN_KOTA_SAMA)
    expect(validasiIsianPencarianPengunjung({ ...SAH, tanggal: '2026-11-17' }, HARI_INI).tanggal).toBe(PESAN_TANGGAL_LAMPAU)
  })

  test.each(['0', '-1', '1.5', 'dua', '1e2', '2 3', '+2'])('2d jumlah "%s" bukan bilangan bulat minimal 1', (jumlah) => {
    expect(validasiIsianPencarianPengunjung({ ...SAH, jumlah }, HARI_INI)).toEqual({ jumlah: PESAN_JUMLAH_TIDAK_SAH })
  })

  test.each([['1', 1], ['02', 2], [' 12 ', 12]])('jumlah "%s" sah = %d', (teks, jumlah) => {
    expect(validasiJumlahPenumpang(teks)).toBeNull()
    expect(jumlahDariTeks(teks)).toBe(jumlah)
  })

  test('jumlah bukan string: kosong atau tidak sah', () => {
    expect(validasiJumlahPenumpang(undefined)).toBe(PESAN_JUMLAH_WAJIB)
    expect(validasiJumlahPenumpang(null)).toBe(PESAN_JUMLAH_WAJIB)
    expect(validasiJumlahPenumpang(2)).toBe(PESAN_JUMLAH_TIDAK_SAH)
    expect(jumlahDariTeks('99999999999999999999')).toBeNull()
  })

  test('kata-kata pesan', () => {
    expect(PESAN_JUMLAH_WAJIB).toBe('Jumlah penumpang wajib diisi')
    expect(PESAN_JUMLAH_TIDAK_SAH).toBe('Jumlah penumpang harus bilangan bulat minimal 1')
  })
})

describe('US-8a saringSisaKursi', () => {
  const daftar = [{ id: 1, sisaKursi: 1 }, { id: 2, sisaKursi: 2 }, { id: 3, sisaKursi: 5 }]
  test('sisa kursi sama dengan atau lebih dari jumlah penumpang', () => {
    expect(saringSisaKursi(daftar, 2).map((f) => f.id)).toEqual([2, 3])
    expect(saringSisaKursi(daftar, 1)).toHaveLength(3)
    expect(saringSisaKursi(daftar, 6)).toEqual([])
  })
})

describe('US-8b validasiDaftarPengunjung (C2 pre, G7)', () => {
  test('daftar kosong atau bukan daftar: pilih satu atau lebih pengunjung', () => {
    expect(validasiDaftarPengunjung([])).toEqual({ pesan: PESAN_DAFTAR_PENGUNJUNG_KOSONG })
    expect(validasiDaftarPengunjung(undefined)).toEqual({ pesan: PESAN_DAFTAR_PENGUNJUNG_KOSONG })
    expect(validasiDaftarPengunjung('1')).toEqual({ pesan: PESAN_DAFTAR_PENGUNJUNG_KOSONG })
  })

  test('G7: id ganda ditolak', () => {
    expect(validasiDaftarPengunjung([3, 4, 3])).toEqual({ pesan: PESAN_PENGUNJUNG_GANDA })
  })

  test('G7 diperiksa sebelum bentuk id: [1, 1, "x"] tetap ganda', () => {
    expect(validasiDaftarPengunjung([1, 1, 'x'])).toEqual({ pesan: PESAN_PENGUNJUNG_GANDA })
  })

  test('idPengunjungDari: id yang bukan bilangan bulat positif bukan pengunjung terdaftar', () => {
    for (const buruk of [[0], [-1], [1.5], ['1'], [null], [1, 'x']]) expect(idPengunjungDari(buruk)).toBeNull()
    expect(idPengunjungDari([9, 2, 5])).toEqual([9, 2, 5])
  })

  test('satu atau lebih id unik sah, urutan dipertahankan', () => {
    expect(validasiDaftarPengunjung([7])).toEqual({ daftar: [7] })
    expect(validasiDaftarPengunjung([9, 2, 5])).toEqual({ daftar: [9, 2, 5] })
  })

  test('kata-kata pesan', () => {
    expect(PESAN_DAFTAR_PENGUNJUNG_KOSONG).toBe('Pilih satu atau lebih pengunjung terdaftar')
    expect(PESAN_PENGUNJUNG_GANDA).toBe('Pengunjung yang sama dipilih dua kali dalam satu pemesanan')
    expect(PESAN_PENGUNJUNG_TIDAK_TERDAFTAR).toBe('Pengunjung tidak terdaftar')
  })
})

describe('US-8b 5a pesan dan salinan data profil', () => {
  const LENGKAP: DataProfil = {
    namaLengkap: 'Maya Lestari',
    nomorIdentitas: '3171010404940004',
    tanggalLahir: '1994-04-04',
    nomorTelepon: '081234567004',
    email: 'maya@contoh.com',
  }

  test('pesan 5a memuat frasa spesifikasi dan nama pengunjung', () => {
    expect(pesanProfilTidakLengkap(['Rizky Hidayat'])).toBe('Data profil tidak lengkap: Rizky Hidayat')
    expect(pesanProfilTidakLengkap(['A', 'B'])).toBe('Data profil tidak lengkap: A, B')
  })

  test('salinDataProfil menyalin profil lengkap dan menolak yang tidak lengkap', () => {
    expect(salinDataProfil(LENGKAP, HARI_INI)).toEqual(LENGKAP)
    expect(salinDataProfil(DATA_PROFIL_KOSONG, HARI_INI)).toBeNull()
    expect(salinDataProfil({ ...LENGKAP, nomorIdentitas: null }, HARI_INI)).toBeNull()
    expect(salinDataProfil({ ...LENGKAP, nomorIdentitas: '123' }, HARI_INI)).toBeNull()
  })
})

describe('inv PesananPengunjung (+ G7)', () => {
  const peran: Record<number, Peran> = { 1: 'Pengunjung', 2: 'Pengunjung', 3: 'CalonPenumpang' }
  const peranAkun = (id: number) => peran[id]

  test('pemesan ManajerTravel: semua penumpang mewakili Pengunjung yang berbeda', () => {
    expect(memenuhiPesananPengunjung({ penumpang: [{ akunId: 1 }, { akunId: 2 }] }, 'ManajerTravel', peranAkun)).toBe(true)
  })

  test('pengunjung ganda melanggar G7', () => {
    expect(memenuhiPesananPengunjung({ penumpang: [{ akunId: 1 }, { akunId: 1 }] }, 'ManajerTravel', peranAkun)).toBe(false)
  })

  test('penumpang tanpa akun atau bukan Pengunjung melanggar', () => {
    expect(memenuhiPesananPengunjung({ penumpang: [{ akunId: null }] }, 'ManajerTravel', peranAkun)).toBe(false)
    expect(memenuhiPesananPengunjung({ penumpang: [{ akunId: 3 }] }, 'ManajerTravel', peranAkun)).toBe(false)
    expect(memenuhiPesananPengunjung({ penumpang: [{ akunId: 99 }] }, 'ManajerTravel', peranAkun)).toBe(false)
  })

  test('pemesan selain ManajerTravel tidak dikenai invarian ini', () => {
    expect(memenuhiPesananPengunjung({ penumpang: [{ akunId: 3 }] }, 'CalonPenumpang', peranAkun)).toBe(true)
  })
})
