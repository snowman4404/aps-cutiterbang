// US-6b Membandingkan harga penerbangan dan US-6c (pilihan perbandingan). Murni; dijalankan di sisi klien pada hasil US-3.
// Harga yang dibandingkan adalah harga yang sama dengan hasil pencarian (tidak dihitung ulang).

export const JUMLAH_PILIHAN_MINIMAL = 2
export const JUMLAH_PILIHAN_MAKSIMAL = 3
export const PESAN_PILIHAN_MAKSIMAL = 'Maksimal 3 penerbangan dapat dibandingkan'
export const LABEL_TERMURAH = 'Termurah'

export type ArahUrutan = 'termurah' | 'termahal'

/** urutkan(daftar, harga, arah): harga naik (termurah) atau turun (termahal); urutan stabil, masukan tidak berubah. */
export const urutkan = <T extends { harga: number }>(daftar: readonly T[], arah: ArahUrutan): T[] =>
  [...daftar].sort((pertama, kedua) => (arah === 'termurah' ? pertama.harga - kedua.harga : kedua.harga - pertama.harga))

/**
 * Memilih penerbangan (3, 3a): pilihan keempat ditolak dengan `PESAN_PILIHAN_MAKSIMAL`; yang sudah terpilih tidak
 * ditambah dua kali.
 */
export function pilihPenerbangan(pilihan: readonly number[], id: number): { pilihan: number[] } | { pesan: string } {
  if (pilihan.includes(id)) return { pilihan: [...pilihan] }
  if (pilihan.length >= JUMLAH_PILIHAN_MAKSIMAL) return { pesan: PESAN_PILIHAN_MAKSIMAL }
  return { pilihan: [...pilihan, id] }
}

/** Membatalkan pilihan sebuah penerbangan. */
export const batalkanPilihan = (pilihan: readonly number[], id: number): number[] => pilihan.filter((p) => p !== id)

/** periksaJumlahPilihan(pilihan): tampilan perbandingan hanya terbuka bila 2 atau 3 dipilih (4, 4a: ditahan bila kurang). */
export const periksaJumlahPilihan = (jumlah: number) => jumlah >= JUMLAH_PILIHAN_MINIMAL && jumlah <= JUMLAH_PILIHAN_MAKSIMAL

/**
 * susunBerdampingan(info): penerbangan terpilih menurut urutan daftar asal (urutan hasil pencarian), bukan urutan
 * memilih; pilihan yang tidak ada di daftar dilewati.
 */
export const susunBerdampingan = <T extends { id: number }>(daftar: readonly T[], pilihan: readonly number[]): T[] =>
  daftar.filter((f) => pilihan.includes(f.id))

/** tandaiTermurah(info): id setiap penerbangan berharga terendah (harga sama: semuanya ditandai). */
export function tandaiTermurah(info: readonly { id: number; harga: number }[]): number[] {
  if (info.length === 0) return []
  const terendah = Math.min(...info.map((f) => f.harga))
  return info.filter((f) => f.harga === terendah).map((f) => f.id)
}
