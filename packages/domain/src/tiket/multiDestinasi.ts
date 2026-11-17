// US-4 Mencari penerbangan multi-destinasi: aturan segmen (2 sampai 5), validasi setiap segmen (3a-3d) dan
// pengurutan dari harga termurah. Murni; pencarian per segmen memakai `cocok()` sekali per segmen (di API).
import { adalahTanggalIso, type TanggalIso } from '../umum/tanggal.ts'
import { rapikanIsian, validasiIsianPencarian, type GalatPencarian, type IsianMentah, type IsianPencarian } from './pencarian.ts'

/** Segmen = satu baris formulir multi-destinasi: kota asal, kota tujuan, tanggal keberangkatan. */
export type Segmen = IsianPencarian
export type SegmenMentah = IsianMentah
/** Galat satu segmen per kolom; objek kosong = segmen valid. */
export type GalatSegmen = GalatPencarian

/** Batas jumlah segmen (Asumsi 8). */
export const JUMLAH_SEGMEN_MINIMAL = 2
export const JUMLAH_SEGMEN_MAKSIMAL = 5

export const PESAN_JUMLAH_SEGMEN = `Maksimal ${JUMLAH_SEGMEN_MAKSIMAL} segmen, minimal ${JUMLAH_SEGMEN_MINIMAL} segmen` // dari ekstensi 2a/2b US-4
/** Ekstensi 3d. Spek tidak memberi kalimat khusus; memakai frasa ekstensinya. */
export const PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA = 'Tanggal keberangkatan lebih awal dari tanggal segmen sebelumnya'

/** Segmen kosong untuk baris baru. */
export const SEGMEN_KOSONG: Segmen = { asal: '', tujuan: '', tanggal: '' }

/** kelolaSegmen 2a: boleh menambah selama kurang dari 5 segmen. */
export const bolehTambahSegmen = (jumlah: number) => jumlah < JUMLAH_SEGMEN_MAKSIMAL
/** kelolaSegmen 2b: boleh menghapus selama setelahnya masih tersisa minimal 2 segmen. */
export const bolehHapusSegmen = (jumlah: number) => jumlah > JUMLAH_SEGMEN_MINIMAL
/** Jumlah segmen yang sah (2 sampai 5). */
export const jumlahSegmenSah = (jumlah: number) => jumlah >= JUMLAH_SEGMEN_MINIMAL && jumlah <= JUMLAH_SEGMEN_MAKSIMAL

/**
 * validasiSetiapSegmen(segmen) (alur 3a-3d): 3a-3c per segmen lewat `validasiIsianPencarian`; 3d bila tanggal sebuah
 * segmen lebih awal dari tanggal segmen sebelumnya (tanggal sama diperbolehkan). 3d hanya dinilai bila kedua tanggal
 * berupa tanggal ISO sah dan tanggal segmen itu belum bergalat lain. Hasil sejajar dengan masukan; satu galat
 * menolak seluruh pencarian.
 */
export function validasiSetiapSegmen(segmen: readonly SegmenMentah[], hariIni: TanggalIso): GalatSegmen[] {
  const galat = segmen.map((isian) => validasiIsianPencarian(isian, hariIni))
  segmen.forEach((isian, i) => {
    if (i === 0 || galat[i]!.tanggal) return
    const tanggal = rapikanIsian(isian).tanggal
    const sebelumnya = rapikanIsian(segmen[i - 1]!).tanggal
    if (adalahTanggalIso(tanggal) && adalahTanggalIso(sebelumnya) && tanggal < sebelumnya) {
      galat[i]!.tanggal = PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA
    }
  })
  return galat
}

/** Ada galat pada segmen mana pun. */
export const adaGalatSegmen = (galat: readonly GalatSegmen[]) => galat.some((g) => Object.keys(g).length > 0)

/**
 * urutkanDariHargaTermurah(daftarSegmen): harga naik; urutan stabil, jadi harga yang sama tetap menurut urutan
 * masukan (waktu berangkat paling awal dulu). Tidak mengubah masukan.
 */
export const urutkanDariHargaTermurah = <T extends { harga: number }>(daftar: readonly T[]): T[] =>
  [...daftar].sort((pertama, kedua) => pertama.harga - kedua.harga)
