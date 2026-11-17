// US-8b (kontrak C2): manajer travel memesan untuk satu atau lebih pengunjung. Aturan murni; akses data ada di API.
import { punyaPeran, type Peran } from '../akses/peran.ts'
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
 * Daftar pengunjung terpilih: tidak kosong (C2 pre, AC2) dan tidak ada id ganda (G7: `self.penumpang->isUnique(mewakili)`).
 * Diperiksa sebelum penerbangan dicari; apakah setiap id adalah pengunjung terdaftar diperiksa sesudahnya (`idPengunjungDari`).
 */
export function validasiDaftarPengunjung(mentah: unknown): { daftar: readonly unknown[] } | { pesan: string } {
  if (!Array.isArray(mentah) || mentah.length === 0) return { pesan: PESAN_DAFTAR_PENGUNJUNG_KOSONG }
  if (new Set(mentah).size !== mentah.length) return { pesan: PESAN_PENGUNJUNG_GANDA }
  return { daftar: mentah }
}

/** Id akun dari daftar terpilih; null bila ada yang bukan bilangan bulat positif (jadi bukan pengunjung terdaftar). */
export const idPengunjungDari = (daftar: readonly unknown[]): number[] | null =>
  daftar.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id >= 1) ? (daftar as number[]) : null

/** Pesan 5a: "Data profil tidak lengkap" yang menyebut nama pengunjung (semua yang tidak lengkap, urut pilihan). */
export const pesanProfilTidakLengkap = (nama: readonly string[]): string => `${PESAN_PROFIL_TIDAK_LENGKAP}: ${nama.join(', ')}`

/** Salinan data Profil sebagai DataWajib (C2: `p.data = p.mewakili.profil.data`); null bila Profil belum lengkap. */
export function salinDataProfil(data: DataProfil, hariIni: TanggalIso): DataWajib | null {
  if (!lengkap(data, hariIni)) return null
  return {
    namaLengkap: data.namaLengkap!,
    nomorIdentitas: data.nomorIdentitas!,
    tanggalLahir: data.tanggalLahir!,
    nomorTelepon: data.nomorTelepon!,
    email: data.email!,
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
  if (!punyaPeran(peranPemesan, ['ManajerTravel'])) return true
  const ids = p.penumpang.map((orang) => orang.akunId)
  const pengunjung = (id: number | null) => {
    const peran = id === null ? undefined : peranAkun(id)
    return peran !== undefined && punyaPeran(peran, ['Pengunjung'])
  }
  return ids.every(pengunjung) && new Set(ids).size === ids.length
}
