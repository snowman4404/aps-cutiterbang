import type { DataProfil } from './profil.ts'
import type { InformasiPenerbangan, StatusBooking } from './pemesanan.ts'

// US-5b: pesan persis dari spesifikasi. Ekstensi 2a tidak punya pesan sendiri; dipakai frasa kolom "Kode booking reference".
export const PESAN_KODE_WAJIB = 'Kolom kode kosong' // frasa ekstensi 2a US-5b
export const PESAN_PROFIL_TIDAK_LENGKAP = 'Data profil tidak lengkap'
export const PESAN_TIKET_BELUM_TERKONFIRMASI = 'Tiket belum terkonfirmasi'
export const PESAN_TIKET_TIDAK_COCOK = 'Data tiket tidak cocok dengan data profil'
export const PESAN_TIKET_SUDAH_TERVALIDASI = 'Tiket sudah tervalidasi'

/** validasiIsianKode (langkah 2, 2a): kode tidak boleh kosong. Mengembalikan kode apa adanya (trim) atau pesan galat kolom. */
export function validasiIsianKode(kode: unknown): { kode: string } | { galat: { kode: string } } {
  const nilai = typeof kode === 'string' ? kode.trim() : ''
  return nilai === '' ? { galat: { kode: PESAN_KODE_WAJIB } } : { kode: nilai }
}

/**
 * Pemesanan.cocokDengan(pr) (langkah 6): ada Penumpang dengan nama lengkap sama tanpa membedakan huruf besar dan kecil
 * dan nomor identitas sama persis dengan data profil. Kolom profil kosong tidak pernah cocok.
 */
export function cocokDengan(
  penumpang: readonly { namaLengkap: string; nomorIdentitas: string }[],
  profil: Pick<DataProfil, 'namaLengkap' | 'nomorIdentitas'>,
): boolean {
  const { namaLengkap, nomorIdentitas } = profil
  if (namaLengkap === null || nomorIdentitas === null) return false
  return penumpang.some((p) => p.namaLengkap.toLowerCase() === namaLengkap.toLowerCase() && p.nomorIdentitas === nomorIdentitas)
}

/** Satu perjalanan pada `perjalananTercatat` member. Tidak memuat data penumpang. */
export interface PerjalananTercatat {
  kode: string
  status: StatusBooking
  penerbangan: InformasiPenerbangan
}

/**
 * Hasil validasiTiket yang diteruskan ke "Formulir Validasi Tiket" (tampilkanHasil).
 * `valid`: tiket cocok dan tercatat (`sudahTercatat` + pesan "Tiket sudah tervalidasi" pada 8a);
 * `tidakValid`: 6a, tanpa data penumpang.
 */
export type HasilValidasiTiket =
  | { hasil: 'valid'; sudahTercatat: boolean; pesan?: string; perjalanan: PerjalananTercatat }
  | { hasil: 'tidakValid'; pesan: string }
