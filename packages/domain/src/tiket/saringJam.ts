// US-6a Menyaring hasil pencarian berdasarkan jam keberangkatan. Murni, dijalankan di sisi klien pada hasil US-3
// yang sudah ada (pencarian tidak diulang). Jam keberangkatan = waktu lokal kota asal (G1), format HH:MM 24 jam.

export const PESAN_JAM_WAJIB = 'Jam awal atau jam akhir kosong' // frasa ekstensi 3a US-6a
export const PESAN_JAM_AKHIR_SEBELUM_AWAL = 'Jam akhir lebih awal dari jam awal'
export const PESAN_FORMAT_JAM = 'Format jam HH:MM, 24 jam (00:00 sampai 23:59)'

export interface IsianJam {
  jamAwal: string
  jamAkhir: string
}
export type GalatJam = Partial<Record<keyof IsianJam, string>>

const FORMAT_JAM = /^([01]\d|2[0-3]):[0-5]\d$/

/** `HH:MM` 24 jam (00:00 sampai 23:59). */
export const adalahJam = (jam: string) => FORMAT_JAM.test(jam)

/**
 * validasiIsianJam(jamAwal, jamAkhir): 3a salah satu kosong (kolom yang kosong ditandai), format harus HH:MM,
 * 3b jam akhir lebih awal dari jam awal. Jam yang sama diperbolehkan (rentang ikut menghitung kedua batas).
 */
export function validasiIsianJam(jamAwal: string, jamAkhir: string): GalatJam {
  const awal = jamAwal.trim()
  const akhir = jamAkhir.trim()
  const galat: GalatJam = {}
  if (!awal) galat.jamAwal = PESAN_JAM_WAJIB
  else if (!adalahJam(awal)) galat.jamAwal = PESAN_FORMAT_JAM
  if (!akhir) galat.jamAkhir = PESAN_JAM_WAJIB
  else if (!adalahJam(akhir)) galat.jamAkhir = PESAN_FORMAT_JAM
  if (Object.keys(galat).length === 0 && akhir < awal) galat.jamAkhir = PESAN_JAM_AKHIR_SEBELUM_AWAL
  return galat
}

/** saringMenurutWaktuBerangkat(jamAwal, jamAkhir): jamAwal <= waktuBerangkat <= jamAkhir (keduanya ikut). Urutan masukan dipertahankan. */
export const saringMenurutWaktuBerangkat = <T extends { waktuBerangkat: string }>(
  daftar: readonly T[],
  jamAwal: string,
  jamAkhir: string,
): T[] => daftar.filter((f) => f.waktuBerangkat >= jamAwal && f.waktuBerangkat <= jamAkhir)
