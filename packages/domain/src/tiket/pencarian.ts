import { adalahTanggalIso, type TanggalIso } from '../umum/tanggal.ts'
import { tersedia, waktuBerangkatAbsolut, type Kota, type Penerbangan } from './penerbangan.ts'

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
/** Isian mentah (mis. dari query string): belum tentu string. */
export type IsianMentah = Partial<Record<keyof IsianPencarian, unknown>>

/** Satu baris hasil pencarian (`tampilkanHasil(daftarCocok)`). */
export interface HasilPencarian {
  id: number
  maskapai: string
  nomorPenerbangan: string
  asal: Kota
  tujuan: Kota
  tanggalKeberangkatan: TanggalIso
  waktuBerangkat: string
  waktuTiba: string
  harga: number
  sisaKursi: number
}

const teks = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Isian mentah menjadi teks yang dirapikan (trim; selain string menjadi kosong). */
export const rapikanIsian = (isian: IsianMentah): IsianPencarian => ({
  asal: teks(isian.asal),
  tujuan: teks(isian.tujuan),
  tanggal: teks(isian.tanggal),
})

/** Id kota dari teks isian ("1" dan "01" sama-sama 1); null bila bukan bilangan bulat tak negatif. */
export const idKotaDariTeks = (isian: string): number | null => (/^\d+$/.test(isian) ? Number(isian) : null)

/**
 * validasiIsian(asal, tujuan, tanggal) (alur 3a, 3b, 3c US-3). Kosong = valid.
 * 3b membandingkan id kota yang sudah di-parse, bukan teks mentah. `hariIni` = tanggal hari ini menurut WIB;
 * tanggal yang sama dengan hari ini diperbolehkan.
 */
export function validasiIsianPencarian(isian: IsianMentah, hariIni: TanggalIso): GalatPencarian {
  const galat: GalatPencarian = {}
  const { asal, tujuan, tanggal } = rapikanIsian(isian)
  const idAsal = idKotaDariTeks(asal)
  if (!asal) galat.asal = PESAN_ASAL_WAJIB
  if (!tujuan) galat.tujuan = PESAN_TUJUAN_WAJIB
  else if (idAsal !== null && idAsal === idKotaDariTeks(tujuan)) galat.tujuan = PESAN_KOTA_SAMA
  if (!tanggal) galat.tanggal = PESAN_TANGGAL_WAJIB
  else if (!adalahTanggalIso(tanggal)) galat.tanggal = PESAN_FORMAT_TANGGAL_KEBERANGKATAN
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
    (pertama, kedua) =>
      waktuBerangkatAbsolut(pertama) - waktuBerangkatAbsolut(kedua) || pertama.nomorPenerbangan.localeCompare(kedua.nomorPenerbangan),
  )
