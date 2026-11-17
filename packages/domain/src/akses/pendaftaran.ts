import type { Peran } from './peran.ts'

export const PERAN_PENDAFTARAN: readonly Peran[] = ['CalonPenumpang', 'MemberFrequentTraveller']

export interface DataPendaftaran {
  nama: string
  email: string
  kataSandi: string
  peran: string
}

export type GalatPendaftaran = Partial<Record<keyof DataPendaftaran, string>>

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Kosong = valid.
export function validasiPendaftaran(data: DataPendaftaran): GalatPendaftaran {
  const galat: GalatPendaftaran = {}
  const nama = typeof data.nama === 'string' ? data.nama.trim() : ''
  if (nama.length < 1 || nama.length > 100) galat.nama = 'Nama harus 1 sampai 100 karakter'
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  if (!POLA_EMAIL.test(email)) galat.email = 'Format email tidak valid (contoh: nama@domain.com)'
  if (typeof data.kataSandi !== 'string' || data.kataSandi.length < 8) {
    galat.kataSandi = 'Kata sandi minimal 8 karakter'
  }
  if (!PERAN_PENDAFTARAN.includes(data.peran as Peran)) {
    galat.peran = 'Pilih Calon Penumpang atau Member Frequent Traveller'
  }
  return galat
}
