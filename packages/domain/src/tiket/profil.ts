import { galatFormat, KOLOM_DATA_WAJIB, lengkap, PESAN_KOLOM, type DataWajibMentah, type GalatDataWajib, type KolomDataWajib } from './dataWajib.ts'
import type { TanggalIso } from '../umum/tanggal.ts'

/** «enumeration» StatusProfil (spec B1). */
export const DAFTAR_STATUS_PROFIL = ['lengkap', 'tidakLengkap'] as const
export type StatusProfil = (typeof DAFTAR_STATUS_PROFIL)[number]
export const LABEL_STATUS_PROFIL: Record<StatusProfil, string> = { lengkap: 'lengkap', tidakLengkap: 'tidak lengkap' }

/** Data Profil: setiap kolom DataWajib boleh kosong (null), US-5a AC5. */
export type DataProfil = { [K in KolomDataWajib]: string | null }
export const DATA_PROFIL_KOSONG: DataProfil = {
  namaLengkap: null,
  nomorIdentitas: null,
  tanggalLahir: null,
  nomorTelepon: null,
  email: null,
}

/** Profil sebagaimana dikirim ke halaman: data terakhir disimpan, kolom wajib dan status (US-5a langkah 1). */
export interface ProfilDto {
  data: DataProfil
  kolomWajib: readonly KolomDataWajib[]
  status: StatusProfil
}

/** Pesan sukses US-5a langkah 7. */
export const PESAN_PROFIL_TERSIMPAN = 'Data profil berhasil disimpan'

/** /statusProfil: lengkap jika DataWajib /lengkap (kelima kolom terisi dan formatValid), selain itu tidakLengkap. `hariIni` = WIB. */
export const statusProfil = (data: DataWajibMentah, hariIni: TanggalIso): StatusProfil =>
  lengkap(data, hariIni) ? 'lengkap' : 'tidakLengkap'

/**
 * validasiFormat (US-5a langkah 4, 4a): hanya kolom yang terisi diperiksa formatnya; kolom kosong tersimpan kosong (null).
 * Kosong = tidak dikirim, null, atau string kosong/spasi. Nilai bertipe lain (mis. angka) adalah kolom terisi yang
 * formatnya salah, jadi ditolak dengan frasa kolomnya, bukan diam-diam dikosongkan.
 * Mengembalikan `{ data }` (nilai di-trim) atau `{ galat }` per kolom yang terisi tetapi formatnya salah (inv FormatTersimpanValid).
 */
export function validasiProfil(mentah: DataWajibMentah, hariIni: TanggalIso): { data: DataProfil } | { galat: GalatDataWajib } {
  const data = { ...DATA_PROFIL_KOSONG }
  const galat: GalatDataWajib = {}
  for (const k of KOLOM_DATA_WAJIB) {
    const isian = mentah[k]
    if (isian === undefined || isian === null) continue
    if (typeof isian !== 'string') {
      galat[k] = PESAN_KOLOM[k]
      continue
    }
    const nilai = isian.trim()
    if (nilai === '') continue
    const g = galatFormat(k, nilai, hariIni)
    if (g) galat[k] = g
    else data[k] = nilai
  }
  return Object.keys(galat).length > 0 ? { galat } : { data }
}
