import { adalahTanggalIso, type TanggalIso } from '../umum/tanggal.ts'

/** Objek nilai DataWajib; `tanggalLahir` = `YYYY-MM-DD`. Dipakai Penumpang (salinan) dan Profil (Fase 5). */
export interface DataWajib {
  namaLengkap: string
  nomorIdentitas: string
  tanggalLahir: TanggalIso
  nomorTelepon: string
  email: string
}

export const KOLOM_DATA_WAJIB = ['namaLengkap', 'nomorIdentitas', 'tanggalLahir', 'nomorTelepon', 'email'] as const
export type KolomDataWajib = (typeof KOLOM_DATA_WAJIB)[number]
export type GalatDataWajib = Partial<Record<KolomDataWajib, string>>
/** Isian mentah (mis. badan JSON): belum tentu string. */
export type DataWajibMentah = Partial<Record<KolomDataWajib, unknown>>

export const PESAN_NAMA_WAJIB = 'Nama lengkap wajib diisi'
export const PESAN_NAMA_TERLALU_PANJANG = 'Nama lengkap maksimal 100 karakter'
export const PESAN_IDENTITAS_WAJIB = 'Nomor identitas wajib diisi'
export const PESAN_IDENTITAS_FORMAT = 'Nomor identitas harus 16 digit'
export const PESAN_TANGGAL_LAHIR_WAJIB = 'Tanggal lahir wajib diisi'
export const PESAN_TANGGAL_LAHIR_FORMAT = 'Format tanggal lahir tidak valid (contoh: 1990-12-31)'
export const PESAN_TANGGAL_LAHIR_LAMPAU = 'Tanggal lahir harus sebelum hari ini'
export const PESAN_TELEPON_WAJIB = 'Nomor telepon wajib diisi'
export const PESAN_TELEPON_FORMAT = 'Nomor telepon harus 10 sampai 13 digit'
export const PESAN_EMAIL_WAJIB = 'Email wajib diisi'
export const PESAN_EMAIL_FORMAT = 'Email harus berbentuk nama@domain'

const PESAN_WAJIB: Record<KolomDataWajib, string> = {
  namaLengkap: PESAN_NAMA_WAJIB,
  nomorIdentitas: PESAN_IDENTITAS_WAJIB,
  tanggalLahir: PESAN_TANGGAL_LAHIR_WAJIB,
  nomorTelepon: PESAN_TELEPON_WAJIB,
  email: PESAN_EMAIL_WAJIB,
}

/** Galat format sebuah nilai yang tidak kosong (sudah di-trim); null = format valid (OCL formatValid per kolom). */
function galatFormat(kolom: KolomDataWajib, nilai: string, hariIni: TanggalIso): string | null {
  switch (kolom) {
    case 'namaLengkap':
      return nilai.length > 100 ? PESAN_NAMA_TERLALU_PANJANG : null
    case 'nomorIdentitas':
      return /^[0-9]{16}$/.test(nilai) ? null : PESAN_IDENTITAS_FORMAT
    case 'tanggalLahir':
      if (!adalahTanggalIso(nilai)) return PESAN_TANGGAL_LAHIR_FORMAT
      return nilai < hariIni ? null : PESAN_TANGGAL_LAHIR_LAMPAU
    case 'nomorTelepon':
      return /^[0-9]{10,13}$/.test(nilai) ? null : PESAN_TELEPON_FORMAT
    case 'email':
      return /^[^@]+@[^@]+$/.test(nilai) ? null : PESAN_EMAIL_FORMAT
  }
}

const teks = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** formatValid(): setiap kolom yang terisi berformat valid (kolom kosong tidak dipersoalkan di sini). `hariIni` = tanggal hari ini. */
export const formatValid = (d: DataWajibMentah, hariIni: TanggalIso): boolean =>
  KOLOM_DATA_WAJIB.every((k) => {
    const nilai = teks(d[k])
    return nilai === '' || galatFormat(k, nilai, hariIni) === null
  })

/** /lengkap: semua kolom terisi dan formatValid(). */
export const lengkap = (d: DataWajibMentah, hariIni: TanggalIso): boolean =>
  KOLOM_DATA_WAJIB.every((k) => teks(d[k]) !== '') && formatValid(d, hariIni)

/**
 * validasiDataPenumpang (US-2a langkah 7, ekstensi 7a): setiap kolom wajib dan berformat valid.
 * Mengembalikan `{ data }` (nilai sudah di-trim) atau `{ galat }` per kolom.
 * `hariIni` = tanggal hari ini (WIB); tanggal lahir harus sebelum hari ini.
 */
export function validasiDataPenumpang(
  mentah: DataWajibMentah,
  hariIni: TanggalIso,
): { data: DataWajib } | { galat: GalatDataWajib } {
  const galat: GalatDataWajib = {}
  const data = {} as DataWajib
  for (const k of KOLOM_DATA_WAJIB) {
    const nilai = teks(mentah[k])
    if (nilai === '') galat[k] = PESAN_WAJIB[k]
    else {
      const g = galatFormat(k, nilai, hariIni)
      if (g) galat[k] = g
      else data[k] = nilai
    }
  }
  return Object.keys(galat).length > 0 ? { galat } : { data }
}
