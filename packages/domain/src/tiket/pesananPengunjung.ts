// US-8b (kontrak C2): manajer travel memesan untuk satu atau lebih pengunjung. Aturan murni; akses data ada di API.
import type { Peran } from '../akses/peran.ts'
import { lengkap, type DataWajib } from './dataWajib.ts'
import type { DataProfil, StatusProfil } from './profil.ts'
import { PESAN_PROFIL_TIDAK_LENGKAP } from './validasiTiket.ts'
import type { TanggalIso } from '../umum/tanggal.ts'

/** C2 pre `ps->notEmpty()` (AC2), dengan frasa langkah 2: "satu atau lebih pengunjung terdaftar". */
export const PESAN_DAFTAR_PENGUNJUNG_KOSONG = 'Pilih satu atau lebih pengunjung terdaftar'
/** Celah G7: pengunjung yang sama dipilih dua kali dalam satu pemesanan. */
export const PESAN_PENGUNJUNG_GANDA = 'Pengunjung yang sama dipilih dua kali dalam satu pemesanan'
/** Id yang bukan akun Pengunjung terdaftar (frasa langkah 2). */
export const PESAN_PENGUNJUNG_TIDAK_TERDAFTAR = 'Pengunjung tidak terdaftar'

/** Pengunjung terdaftar beserta data Profilnya (langkah 3, `dataProfil()`). */
export interface PengunjungDto {
  id: number
  nama: string
  data: DataProfil
  status: StatusProfil
}

/**
 * Daftar pengunjung terpilih: tidak kosong (C2 pre, AC2) dan tidak ada id ganda (G7:
 * `self.penumpang->isUnique(mewakili)`). Hanya bilangan bulat positif yang diterima sebagai id; selain itu
 * bukan pengunjung terdaftar.
 */
export function validasiDaftarPengunjung(mentah: unknown): { ids: number[] } | { pesan: string } {
  if (!Array.isArray(mentah) || mentah.length === 0) return { pesan: PESAN_DAFTAR_PENGUNJUNG_KOSONG }
  if (!mentah.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id >= 1)) {
    return { pesan: PESAN_PENGUNJUNG_TIDAK_TERDAFTAR }
  }
  const ids = mentah as number[]
  if (new Set(ids).size !== ids.length) return { pesan: PESAN_PENGUNJUNG_GANDA }
  return { ids }
}

/** Pesan 5a: "Data profil tidak lengkap" yang menyebut nama pengunjung (semua yang tidak lengkap, urut pilihan). */
export const pesanProfilTidakLengkap = (nama: readonly string[]): string => `${PESAN_PROFIL_TIDAK_LENGKAP}: ${nama.join(', ')}`

/** Salinan data Profil sebagai DataWajib (C2: `p.data = p.mewakili.profil.data`); null bila Profil belum lengkap. */
export function salinDataProfil(data: DataProfil, hariIni: TanggalIso): DataWajib | null {
  if (!lengkap(data, hariIni)) return null
  return {
    namaLengkap: data.namaLengkap!.trim(),
    nomorIdentitas: data.nomorIdentitas!.trim(),
    tanggalLahir: data.tanggalLahir!.trim(),
    nomorTelepon: data.nomorTelepon!.trim(),
    email: data.email!.trim(),
  }
}

/**
 * inv PesananPengunjung (+ G7): bila pemesan adalah ManajerTravel, setiap Penumpang `mewakili` akun Pengunjung dan
 * tidak ada pengunjung yang tercantum dua kali. `peranAkun` memberi peran akun menurut id (undefined = akun tidak ada).
 */
export const memenuhiPesananPengunjung = (
  p: { penumpang: { akunId: number | null }[] },
  peranPemesan: Peran,
  peranAkun: (akunId: number) => Peran | undefined,
): boolean => {
  if (peranPemesan !== 'ManajerTravel') return true
  const ids = p.penumpang.map((orang) => orang.akunId)
  return (
    ids.every((id) => id !== null && peranAkun(id) === 'Pengunjung') && new Set(ids).size === ids.length
  )
}
