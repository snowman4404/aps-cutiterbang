import { adalahTanggalValid } from './tanggal.ts'
import { tersedia, waktuBerangkatAbsolut, type Penerbangan } from './penerbangan.ts'

export const PESAN_PENERBANGAN_TIDAK_DITEMUKAN = 'Penerbangan tidak ditemukan'

export const PESAN_ASAL_WAJIB = 'Kota asal wajib dipilih'
export const PESAN_TUJUAN_WAJIB = 'Kota tujuan wajib dipilih'
export const PESAN_TANGGAL_WAJIB = 'Tanggal keberangkatan wajib diisi'
export const PESAN_KOTA_SAMA = 'Kota tujuan harus berbeda dari kota asal'
export const PESAN_TANGGAL_LAMPAU = 'Tanggal keberangkatan tidak boleh sebelum hari ini'
export const PESAN_FORMAT_TANGGAL_KEBERANGKATAN = 'Format tanggal tidak valid (contoh: 2026-12-31)'
export const PESAN_ASAL_TIDAK_DIKENAL = 'Kota asal tidak dikenal'
export const PESAN_TUJUAN_TIDAK_DIKENAL = 'Kota tujuan tidak dikenal'

export interface IsianPencarian {
  asal: string
  tujuan: string
  tanggal: string
}
export type GalatPencarian = Partial<Record<keyof IsianPencarian, string>>

const teks = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/**
 * validasiIsian(asal, tujuan, tanggal) (alur 3a, 3b, 3c US-3). Kosong = valid.
 * `hariIni` = tanggal hari ini menurut WIB; tanggal yang sama dengan hari ini diperbolehkan.
 */
export function validasiIsianPencarian(
  isian: Partial<Record<keyof IsianPencarian, unknown>>,
  hariIni: string,
): GalatPencarian {
  const galat: GalatPencarian = {}
  const asal = teks(isian.asal)
  const tujuan = teks(isian.tujuan)
  const tanggal = teks(isian.tanggal)
  if (!asal) galat.asal = PESAN_ASAL_WAJIB
  if (!tujuan) galat.tujuan = PESAN_TUJUAN_WAJIB
  else if (asal && asal === tujuan) galat.tujuan = PESAN_KOTA_SAMA
  if (!tanggal) galat.tanggal = PESAN_TANGGAL_WAJIB
  else if (!adalahTanggalValid(tanggal)) galat.tanggal = PESAN_FORMAT_TANGGAL_KEBERANGKATAN
  else if (tanggal < hariIni) galat.tanggal = PESAN_TANGGAL_LAMPAU
  return galat
}

/** cocok(asal, tujuan, tanggal) = tersedia and asal = a and tujuan = t and tanggalKeberangkatan = tgl. */
export const cocok = (
  f: Penerbangan,
  kriteria: { asalId: number; tujuanId: number; tanggal: string },
  sekarang: Date,
  jumlahPenumpangAktif: number,
): boolean =>
  tersedia(f, sekarang, jumlahPenumpangAktif) &&
  f.asal.id === kriteria.asalId &&
  f.tujuan.id === kriteria.tujuanId &&
  f.tanggalKeberangkatan === kriteria.tanggal

/** urutkanMenurutWaktuBerangkat: instan keberangkatan paling awal dulu (tidak mengubah masukan). */
export const urutkanMenurutWaktuBerangkat = <T extends Penerbangan>(daftar: readonly T[]): T[] =>
  [...daftar].sort(
    (a, b) =>
      waktuBerangkatAbsolut(a) - waktuBerangkatAbsolut(b) || a.nomorPenerbangan.localeCompare(b.nomorPenerbangan),
  )
