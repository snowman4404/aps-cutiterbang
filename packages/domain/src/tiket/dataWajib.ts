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

// Pesan per kolom = frasa "Variasi teknologi dan data" US-2a; dipakai untuk kolom kosong maupun salah format.
export const PESAN_NAMA_LENGKAP = 'Nama lengkap 1 sampai 100 karakter'
export const PESAN_NOMOR_IDENTITAS = 'Nomor identitas 16 digit'
export const PESAN_TANGGAL_LAHIR = 'Tanggal lahir sebelum hari ini'
export const PESAN_NOMOR_TELEPON = 'Nomor telepon 10 sampai 13 digit'
export const PESAN_EMAIL = 'Email berbentuk nama@domain'
/** Ekstensi 7a: tampil bersama penanda kolom yang salah. */
export const PESAN_DATA_PENUMPANG_TIDAK_LENGKAP = 'Data penumpang wajib tidak lengkap'

/** Frasa format spesifikasi per kolom ("Variasi teknologi dan data"). */
export const PESAN_KOLOM: Record<KolomDataWajib, string> = {
  namaLengkap: PESAN_NAMA_LENGKAP,
  nomorIdentitas: PESAN_NOMOR_IDENTITAS,
  tanggalLahir: PESAN_TANGGAL_LAHIR,
  nomorTelepon: PESAN_NOMOR_TELEPON,
  email: PESAN_EMAIL,
}

/** Galat format sebuah nilai yang tidak kosong (sudah di-trim); null = format valid (OCL formatValid per kolom). */
export function galatFormat(kolom: KolomDataWajib, nilai: string, hariIni: TanggalIso): string | null {
  switch (kolom) {
    case 'namaLengkap':
      return nilai.length > 100 ? PESAN_NAMA_LENGKAP : null
    case 'nomorIdentitas':
      return /^[0-9]{16}$/.test(nilai) ? null : PESAN_NOMOR_IDENTITAS
    case 'tanggalLahir':
      if (!adalahTanggalIso(nilai)) return PESAN_TANGGAL_LAHIR
      return nilai < hariIni ? null : PESAN_TANGGAL_LAHIR
    case 'nomorTelepon':
      return /^[0-9]{10,13}$/.test(nilai) ? null : PESAN_NOMOR_TELEPON
    case 'email':
      return /^[^@]+@[^@]+$/.test(nilai) ? null : PESAN_EMAIL
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
 * validasiDataPenumpang (US-2a langkah 7, ekstensi 7a): setiap kolom wajib dan berformat valid;
 * pesan per kolom sama untuk kosong dan salah format (frasa spesifikasi).
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
    if (nilai === '') galat[k] = PESAN_KOLOM[k]
    else {
      const g = galatFormat(k, nilai, hariIni)
      if (g) galat[k] = g
      else data[k] = nilai
    }
  }
  return Object.keys(galat).length > 0 ? { galat } : { data }
}
