import type { Peran } from './peran.ts'

export const PERAN_PENDAFTARAN = ['CalonPenumpang', 'MemberFrequentTraveller'] as const satisfies readonly Peran[]

/** Peran yang boleh dipilih saat mendaftar (G10). */
export type PeranPendaftaran = (typeof PERAN_PENDAFTARAN)[number]

/** Isian mentah dari formulir / badan permintaan: peran masih string. */
export interface DataPendaftaran {
  nama: string
  email: string
  kataSandi: string
  peran: string
}

/** Data yang sudah lolos validasi: peran sudah menyempit ke PeranPendaftaran, nama dan email dirapikan (trim). */
export interface DataPendaftaranSah {
  nama: string
  email: string
  kataSandi: string
  peran: PeranPendaftaran
}

export type GalatPendaftaran = Partial<Record<keyof DataPendaftaran, string>>

export type HasilValidasiPendaftaran =
  | { ok: true; data: DataPendaftaranSah }
  | { ok: false; galat: GalatPendaftaran }

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const adalahPeranPendaftaran = (peran: string): peran is PeranPendaftaran =>
  (PERAN_PENDAFTARAN as readonly string[]).includes(peran)

export function validasiPendaftaran(data: DataPendaftaran): HasilValidasiPendaftaran {
  const galat: GalatPendaftaran = {}
  const nama = typeof data.nama === 'string' ? data.nama.trim() : ''
  if (nama.length < 1 || nama.length > 100) galat.nama = 'Nama harus 1 sampai 100 karakter'
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  if (!POLA_EMAIL.test(email)) galat.email = 'Format email tidak valid (contoh: nama@domain.com)'
  const kataSandi = typeof data.kataSandi === 'string' ? data.kataSandi : ''
  if (kataSandi.length < 8) galat.kataSandi = 'Kata sandi minimal 8 karakter'
  const peran = data.peran
  if (!adalahPeranPendaftaran(peran)) {
    galat.peran = 'Pilih Calon Penumpang atau Member Frequent Traveller'
    return { ok: false, galat }
  }
  if (Object.keys(galat).length > 0) return { ok: false, galat }
  return { ok: true, data: { nama, email, kataSandi, peran } }
}
