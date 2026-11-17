import { jumlahHariKerja, type DaftarHariLibur } from './kalenderKerja.ts'
import { adalahTanggalIso, type TanggalIso } from './tanggal.ts'

export type StatusPengajuanCuti = 'Diajukan' | 'Disetujui' | 'Ditolak'
export const DAFTAR_STATUS_PENGAJUAN: readonly StatusPengajuanCuti[] = ['Diajukan', 'Disetujui', 'Ditolak']

export interface PengajuanCuti {
  tanggalMulai: TanggalIso
  tanggalAkhir: TanggalIso
  status: StatusPengajuanCuti
}

export const PESAN_TIDAK_ADA_PENGAJUAN = 'Tidak ada pengajuan cuti pada periode ini'
export const PESAN_BELUM_ADA_RIWAYAT = 'Belum ada riwayat cuti'

type Rentang = Pick<PengajuanCuti, 'tanggalMulai' | 'tanggalAkhir'>

/** /lamaCuti: jumlah hari kerja dari tanggalMulai sampai tanggalAkhir (inklusif). */
export const lamaCuti = (p: Rentang, libur: DaftarHariLibur) =>
  jumlahHariKerja(p.tanggalMulai, p.tanggalAkhir, libur)

/** beririsan(mulai, akhir): tanggalMulai <= akhir and tanggalAkhir >= mulai (ujung yang bersentuhan ikut). */
export const beririsan = (p: Rentang, mulai: TanggalIso, akhir: TanggalIso) =>
  p.tanggalMulai <= akhir && p.tanggalAkhir >= mulai

export interface PeriodeInput {
  mulai: string
  akhir: string
}
export type GalatPeriode = Partial<Record<keyof PeriodeInput, string>>

export const PESAN_MULAI_WAJIB = 'Tanggal mulai wajib diisi'
export const PESAN_AKHIR_WAJIB = 'Tanggal akhir wajib diisi'
export const PESAN_AKHIR_SEBELUM_MULAI = 'Tanggal akhir tidak boleh lebih awal dari tanggal mulai'
export const PESAN_TANGGAL_TIDAK_VALID = 'Format tanggal tidak valid (contoh: 2026-12-31)'

/** validasiPeriode (alur 2a, 2b US-1a). Kosong = valid. */
export function validasiPeriode(p: { mulai?: unknown; akhir?: unknown }): GalatPeriode {
  const galat: GalatPeriode = {}
  const mulai = typeof p.mulai === 'string' ? p.mulai.trim() : ''
  const akhir = typeof p.akhir === 'string' ? p.akhir.trim() : ''
  if (!mulai) galat.mulai = PESAN_MULAI_WAJIB
  else if (!adalahTanggalIso(mulai)) galat.mulai = PESAN_TANGGAL_TIDAK_VALID
  if (!akhir) galat.akhir = PESAN_AKHIR_WAJIB
  else if (!adalahTanggalIso(akhir)) galat.akhir = PESAN_TANGGAL_TIDAK_VALID
  if (!galat.mulai && !galat.akhir && akhir < mulai) galat.akhir = PESAN_AKHIR_SEBELUM_MULAI
  return galat
}

/** urutkanDariTanggalMulaiPalingAwal (tidak mengubah masukan). */
export const urutkanDariTanggalMulaiPalingAwal = <T extends Rentang>(daftar: readonly T[]): T[] =>
  [...daftar].sort(
    (a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai) || a.tanggalAkhir.localeCompare(b.tanggalAkhir),
  )

/** urutkanDariPalingBaru: tanggalMulai menurun (tidak mengubah masukan). */
export const urutkanDariPalingBaru = <T extends Rentang>(daftar: readonly T[]): T[] =>
  [...daftar].sort(
    (a, b) => b.tanggalMulai.localeCompare(a.tanggalMulai) || b.tanggalAkhir.localeCompare(a.tanggalAkhir),
  )

/** Pengajuan US-1a: status Diajukan atau Disetujui yang beririsan dengan periode, urut tanggalMulai naik. */
export function pengajuanPadaPeriode<T extends PengajuanCuti>(
  daftar: readonly T[],
  mulai: TanggalIso,
  akhir: TanggalIso,
): T[] {
  return urutkanDariTanggalMulaiPalingAwal(
    daftar.filter((p) => (p.status === 'Diajukan' || p.status === 'Disetujui') && beririsan(p, mulai, akhir)),
  )
}
