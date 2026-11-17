import { describe, expect, test } from 'vitest'
import {
  beririsan,
  cutiDisetujuiTahunIni,
  hariIniWib,
  isHariKerja,
  jumlahHariKerja,
  lamaCuti,
  pengajuanPadaPeriode,
  PESAN_AKHIR_SEBELUM_MULAI,
  PESAN_AKHIR_WAJIB,
  PESAN_MULAI_WAJIB,
  riwayatCuti,
  sisaCuti,
  tambahHari,
  urutkanDariPalingBaru,
  urutkanDariTanggalMulaiPalingAwal,
  validasiPeriode,
  type PengajuanCuti,
} from './index.ts'

// 2026-11-16 adalah Senin.
const cuti = (
  tanggalMulai: string,
  tanggalAkhir: string,
  status: PengajuanCuti['status'] = 'Disetujui',
): PengajuanCuti => ({ tanggalMulai, tanggalAkhir, status })
const HARI_INI = '2026-11-17'

describe('tanggal', () => {
  test('tambahHari lintas bulan dan tahun', () => {
    expect(tambahHari('2026-12-31', 1)).toBe('2027-01-01')
    expect(tambahHari('2028-02-28', 1)).toBe('2028-02-29')
  })
  test('hariIniWib memakai WIB (UTC+7)', () => {
    expect(hariIniWib(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01')
    expect(hariIniWib(new Date('2026-12-31T10:00:00Z'))).toBe('2026-12-31')
  })
})

describe('KalenderKerja', () => {
  test('akhir pekan bukan hari kerja', () => {
    expect(isHariKerja('2026-11-16', [])).toBe(true) // Senin
    expect(isHariKerja('2026-11-20', [])).toBe(true) // Jumat
    expect(isHariKerja('2026-11-21', [])).toBe(false) // Sabtu
    expect(isHariKerja('2026-11-22', [])).toBe(false) // Minggu
  })
  test('HariLibur bukan hari kerja', () => {
    expect(isHariKerja('2026-11-18', ['2026-11-18'])).toBe(false)
    expect(isHariKerja('2026-11-18', new Set(['2026-11-18']))).toBe(false)
  })
  test('jumlahHariKerja: kedua ujung inklusif, satu hari, akhir pekan dikecualikan', () => {
    expect(jumlahHariKerja('2026-11-16', '2026-11-20', [])).toBe(5)
    expect(jumlahHariKerja('2026-11-16', '2026-11-16', [])).toBe(1)
    expect(jumlahHariKerja('2026-11-21', '2026-11-21', [])).toBe(0)
    expect(jumlahHariKerja('2026-11-16', '2026-11-27', [])).toBe(10)
  })
  test('hari libur di hari kerja dikurangi, di akhir pekan tidak berpengaruh ganda', () => {
    expect(jumlahHariKerja('2026-11-16', '2026-11-20', ['2026-11-18'])).toBe(4)
    expect(jumlahHariKerja('2026-11-16', '2026-11-27', ['2026-11-18', '2026-11-21'])).toBe(9)
  })
  test('lamaCuti memakai kalender kerja', () => {
    expect(lamaCuti(cuti('2026-11-19', '2026-11-24'), [])).toBe(4)
  })
})

describe('beririsan', () => {
  const p = cuti('2026-11-10', '2026-11-20')
  test.each([
    ['di dalam', '2026-11-12', '2026-11-14', true],
    ['mencakup', '2026-11-01', '2026-11-30', true],
    ['bersentuhan di akhir periode', '2026-11-01', '2026-11-10', true],
    ['bersentuhan di awal periode', '2026-11-20', '2026-11-30', true],
    ['sebelum', '2026-11-01', '2026-11-09', false],
    ['sesudah', '2026-11-21', '2026-11-30', false],
  ])('%s', (_n, mulai, akhir, hasil) => {
    expect(beririsan(p, mulai, akhir)).toBe(hasil)
  })
})

describe('validasiPeriode', () => {
  test('valid = kosong', () => {
    expect(validasiPeriode({ mulai: '2026-11-01', akhir: '2026-11-01' })).toEqual({})
  })
  test('kosong ditolak per kolom', () => {
    expect(validasiPeriode({ mulai: '', akhir: '' })).toEqual({
      mulai: PESAN_MULAI_WAJIB,
      akhir: PESAN_AKHIR_WAJIB,
    })
    expect(validasiPeriode({ mulai: '2026-11-01' })).toEqual({ akhir: PESAN_AKHIR_WAJIB })
  })
  test('akhir lebih awal dari mulai menandai tanggal akhir', () => {
    expect(validasiPeriode({ mulai: '2026-11-10', akhir: '2026-11-09' })).toEqual({
      akhir: PESAN_AKHIR_SEBELUM_MULAI,
    })
  })
  test('format tidak valid ditolak', () => {
    expect(validasiPeriode({ mulai: '2026-13-01', akhir: '2026-11-09' }).mulai).toBeDefined()
    expect(validasiPeriode({ mulai: '2026-02-30', akhir: '2026-03-09' }).mulai).toBeDefined()
  })
})

describe('pengajuanPadaPeriode', () => {
  const daftar = [
    cuti('2026-11-20', '2026-11-25', 'Diajukan'),
    cuti('2026-11-05', '2026-11-10', 'Disetujui'),
    cuti('2026-11-12', '2026-11-13', 'Ditolak'),
    cuti('2026-12-01', '2026-12-02', 'Disetujui'),
  ]
  test('Diajukan dan Disetujui saja, beririsan, urut tanggalMulai naik', () => {
    const hasil = pengajuanPadaPeriode(daftar, '2026-11-10', '2026-11-20')
    expect(hasil.map((p) => p.tanggalMulai)).toEqual(['2026-11-05', '2026-11-20'])
  })
  test('tidak ada = kosong', () => {
    expect(pengajuanPadaPeriode(daftar, '2027-01-01', '2027-01-31')).toEqual([])
  })
  test('pengurutan tidak mengubah masukan', () => {
    const asli = [cuti('2026-02-01', '2026-02-02'), cuti('2026-01-01', '2026-01-02')]
    expect(urutkanDariTanggalMulaiPalingAwal(asli)[0]?.tanggalMulai).toBe('2026-01-01')
    expect(urutkanDariPalingBaru(asli)[0]?.tanggalMulai).toBe('2026-02-01')
    expect(asli[0]?.tanggalMulai).toBe('2026-02-01')
  })
})

describe('riwayatCuti dan sisaCuti', () => {
  const libur = ['2026-03-18']
  const daftar = [
    cuti('2026-03-16', '2026-03-20'), // 4 hari kerja (1 libur)
    cuti('2026-08-03', '2026-08-04'), // 2
    cuti('2026-09-07', '2026-09-08', 'Diajukan'),
    cuti('2026-10-05', '2026-10-06', 'Ditolak'),
    cuti('2025-12-29', '2026-01-02'), // mulai tahun lalu: tidak dihitung
    cuti('2026-12-28', '2027-01-04'), // lintas tahun: dihitung penuh ke 2026
  ]
  test('hanya Disetujui yang mulai tahun ini', () => {
    expect(cutiDisetujuiTahunIni(daftar, HARI_INI)).toHaveLength(3)
  })
  test('riwayat urut terbaru dulu; lintas tahun hanya di tahun mulainya', () => {
    expect(riwayatCuti(daftar, HARI_INI).map((p) => p.tanggalMulai)).toEqual([
      '2026-12-28',
      '2026-08-03',
      '2026-03-16',
    ])
    expect(riwayatCuti(daftar, '2027-02-01')).toEqual([])
  })
  test('sisa = jatah - hari kerja Disetujui; lintas tahun dihitung penuh', () => {
    // 4 + 2 + (28, 29, 30, 31 Des + 1 Jan + 4 Jan = 6)
    expect(sisaCuti(12, daftar, HARI_INI, libur)).toBe(0)
  })
  test('Diajukan/Ditolak/tahun lalu tidak mengurangi sisa', () => {
    const d = [cuti('2026-09-07', '2026-09-08', 'Diajukan'), cuti('2025-03-03', '2025-03-07')]
    expect(sisaCuti(12, d, HARI_INI, [])).toBe(12)
  })
  test('sisa boleh negatif', () => {
    expect(sisaCuti(3, [cuti('2026-03-02', '2026-03-13')], HARI_INI, [])).toBe(-7)
  })
})
