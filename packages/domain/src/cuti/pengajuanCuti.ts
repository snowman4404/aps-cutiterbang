import { jumlahHariKerja, type DaftarHariLibur } from './kalenderKerja.ts'
import { adalahTanggalIso, type TanggalIso } from '../umum/tanggal.ts'

/** Sumber tunggal status PengajuanCuti; tipe, kolom DB, dan peta tampilan diturunkan dari sini. */
export const DAFTAR_STATUS_PENGAJUAN = ['Diajukan', 'Disetujui', 'Ditolak'] as const
export type StatusPengajuanCuti = (typeof DAFTAR_STATUS_PENGAJUAN)[number]

/** Status yang tampil di US-1a (Ditolak tidak). */
const STATUS_PADA_DAFTAR: readonly StatusPengajuanCuti[] = ['Diajukan', 'Disetujui']

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

/** Periode yang sudah valid: akhir >= mulai. */
export interface Periode {
  mulai: TanggalIso
  akhir: TanggalIso
}

/** beririsan(periode): tanggalMulai <= akhir and tanggalAkhir >= mulai (ujung yang bersentuhan ikut). */
export const beririsan = (p: Rentang, periode: Periode) =>
  p.tanggalMulai <= periode.akhir && p.tanggalAkhir >= periode.mulai

export interface PeriodeInput {
  mulai: string
  akhir: string
}
export type GalatPeriode = Partial<Record<keyof PeriodeInput, string>>

export const PESAN_MULAI_WAJIB = 'Tanggal mulai wajib diisi'
export const PESAN_AKHIR_WAJIB = 'Tanggal akhir wajib diisi'
export const PESAN_AKHIR_SEBELUM_MULAI = 'Tanggal akhir tidak boleh lebih awal dari tanggal mulai'
export const PESAN_TANGGAL_TIDAK_VALID = 'Format tanggal tidak valid (contoh: 2026-12-31)'

export type HasilPeriode = { periode: Periode } | { galat: GalatPeriode }

/** validasiPeriode (alur 2a, 2b US-1a): masukan mentah (boleh kosong) -> `Periode` yang valid atau galat per kolom. */
export function validasiPeriode(p: { mulai?: unknown; akhir?: unknown }): HasilPeriode {
  const galat: GalatPeriode = {}
  const mulai = typeof p.mulai === 'string' ? p.mulai.trim() : ''
  const akhir = typeof p.akhir === 'string' ? p.akhir.trim() : ''
  if (!mulai) galat.mulai = PESAN_MULAI_WAJIB
  else if (!adalahTanggalIso(mulai)) galat.mulai = PESAN_TANGGAL_TIDAK_VALID
  if (!akhir) galat.akhir = PESAN_AKHIR_WAJIB
  else if (!adalahTanggalIso(akhir)) galat.akhir = PESAN_TANGGAL_TIDAK_VALID
  if (!galat.mulai && !galat.akhir && akhir < mulai) galat.akhir = PESAN_AKHIR_SEBELUM_MULAI
  return Object.keys(galat).length > 0 ? { galat } : { periode: { mulai, akhir } }
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
  periode: Periode,
): T[] {
  return urutkanDariTanggalMulaiPalingAwal(
    daftar.filter((p) => STATUS_PADA_DAFTAR.includes(p.status) && beririsan(p, periode)),
  )
}
