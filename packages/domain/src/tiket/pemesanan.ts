import { waktuBerangkatAbsolut, type Penerbangan } from './penerbangan.ts'
import type { HasilPencarian } from './pencarian.ts'

/** StatusBooking (mesin status, 4 status). Sumber tunggal; tipe dan label diturunkan dari daftar ini. */
export const DAFTAR_STATUS_BOOKING = ['WaitingForThePayment', 'Booked', 'Confirmed', 'Cancelled'] as const
export type StatusBooking = (typeof DAFTAR_STATUS_BOOKING)[number]

export const LABEL_STATUS_BOOKING: Record<StatusBooking, string> = {
  WaitingForThePayment: 'Waiting for the payment',
  Booked: 'Booked',
  Confirmed: 'Confirmed',
  Cancelled: 'Cancelled',
}

/** Pemicu transisi: dua dari sistem luar (pembayaran, maskapai) dan `batalkan` (kontrak C3 oleh pemesan). */
export type PemicuBooking = 'pembayaranBerhasil' | 'konfirmasiMaskapai' | 'batalkan'

const TRANSISI: Record<StatusBooking, Partial<Record<PemicuBooking, StatusBooking>>> = {
  WaitingForThePayment: { pembayaranBerhasil: 'Booked', batalkan: 'Cancelled' },
  Booked: { konfirmasiMaskapai: 'Confirmed', batalkan: 'Cancelled' },
  Confirmed: { batalkan: 'Cancelled' }, // keputusan G5: Confirmed -> Cancelled diizinkan
  Cancelled: {}, // final
}

/** Status berikutnya menurut mesin status, atau null bila transisi tidak diizinkan. Guard "belum berangkat" ada di `dapatDibatalkan`. */
export const transisi = (status: StatusBooking, pemicu: PemicuBooking): StatusBooking | null =>
  TRANSISI[status][pemicu] ?? null

/**
 * Pemesanan.dapatDibatalkan (US-2b 2a): belum Cancelled dan waktu berangkatnya masih setelah `sekarang`.
 * `waktuBerangkat` adalah instan absolut dari `waktuBerangkatAbsolut` (G1).
 */
export const dapatDibatalkan = (p: { status: StatusBooking; waktuBerangkat: Date }, sekarang: Date): boolean =>
  transisi(p.status, 'batalkan') !== null && p.waktuBerangkat.getTime() > sekarang.getTime()

/** Pemesanan.dapatDibatalkan dari penerbangannya: hitung instan berangkat absolut lalu periksa. */
export const dapatDibatalkanPada = (
  status: StatusBooking,
  f: Pick<Penerbangan, 'tanggalKeberangkatan' | 'waktuBerangkat' | 'asal'>,
  sekarang: Date,
): boolean => dapatDibatalkan({ status, waktuBerangkat: new Date(waktuBerangkatAbsolut(f)) }, sekarang)

/** Informasi penerbangan (`informasiPenerbangan`): baris hasil pencarian ditambah /tersedia. Dipakai ringkasan dan Tiket Saya. */
export interface InformasiPenerbangan extends HasilPencarian {
  tersedia: boolean
}

export const PESAN_PEMESANAN_TIDAK_DITEMUKAN = 'Pemesanan tidak ditemukan'
export const PESAN_SUDAH_DIBATALKAN = 'Pemesanan sudah dibatalkan'
export const PESAN_SUDAH_BERANGKAT = 'Pemesanan tidak dapat dibatalkan karena penerbangan sudah berangkat'

/** Satu pemesanan di "Tiket Saya". */
export interface TiketSaya {
  kode: string
  status: StatusBooking
  label: string
  /** Instan pembuatan, ISO 8601 UTC. */
  waktuDibuat: string
  /** Hanya benar bila akun adalah pemesan dan `dapatDibatalkan` berlaku (G4, US-2b 2a). */
  dapatDibatalkan: boolean
  penumpang: string[]
  penerbangan: InformasiPenerbangan
}
