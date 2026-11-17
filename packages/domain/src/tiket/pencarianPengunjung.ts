// US-8a: pencarian penerbangan untuk pengunjung = pencarian US-3 ditambah jumlah penumpang (ekstensi 2d) dan
// penyaringan sisa kursi (langkah 3, "saringSisaKursi"). Validasi 2a-2c memakai `validasiIsianPencarian`.
import type { TanggalIso } from '../umum/tanggal.ts'
import { validasiIsianPencarian, type GalatPencarian, type IsianMentah } from './pencarian.ts'

export const PESAN_JUMLAH_WAJIB = 'Jumlah penumpang wajib diisi'
export const PESAN_JUMLAH_TIDAK_SAH = 'Jumlah penumpang harus bilangan bulat minimal 1'

/** Isian mentah US-8a: isian US-3 ditambah `jumlah` (jumlah penumpang). */
export type IsianMentahPengunjung = IsianMentah & { jumlah?: unknown }
export type GalatPencarianPengunjung = GalatPencarian & { jumlah?: string }

/** Jumlah penumpang dari teks isian ("2" dan "02" sama-sama 2); null bila bukan bilangan bulat minimal 1. */
export function jumlahDariTeks(isian: unknown): number | null {
  const teks = typeof isian === 'string' ? isian.trim() : ''
  if (!/^\d+$/.test(teks)) return null
  const jumlah = Number(teks)
  return Number.isSafeInteger(jumlah) && jumlah >= 1 ? jumlah : null
}

/** 2a (kosong) dan 2d (bukan bilangan bulat minimal 1) untuk jumlah penumpang; null bila sah. */
export function validasiJumlahPenumpang(isian: unknown): string | null {
  if (typeof isian === 'string' ? isian.trim() === '' : isian === undefined || isian === null) return PESAN_JUMLAH_WAJIB
  return jumlahDariTeks(isian) === null ? PESAN_JUMLAH_TIDAK_SAH : null
}

/** validasiIsian(asal, tujuan, tanggal, jumlah) (langkah 2, 2a-2d). Kosong = valid. */
export function validasiIsianPencarianPengunjung(isian: IsianMentahPengunjung, hariIni: TanggalIso): GalatPencarianPengunjung {
  const galat: GalatPencarianPengunjung = validasiIsianPencarian(isian, hariIni)
  const galatJumlah = validasiJumlahPenumpang(isian.jumlah)
  if (galatJumlah) galat.jumlah = galatJumlah
  return galat
}

/** saringSisaKursi(daftarCocok, jumlah) (langkah 3): hanya penerbangan dengan sisaKursi >= jumlah penumpang. */
export const saringSisaKursi = <T extends { sisaKursi: number }>(daftar: readonly T[], jumlah: number): T[] =>
  daftar.filter((penerbangan) => penerbangan.sisaKursi >= jumlah)
