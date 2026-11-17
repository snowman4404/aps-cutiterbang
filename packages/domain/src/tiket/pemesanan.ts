import { punyaPeran, type Peran } from '../akses/peran.ts'
import { lengkap, type DataWajibMentah } from './dataWajib.ts'
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

/** Status awal Pemesanan baru (US-2a langkah 8) dan status akhir pembatalan (C3); dipakai boundary sebagai parameter SQL. */
export const STATUS_AWAL_BOOKING: StatusBooking = 'WaitingForThePayment'
export const STATUS_DIBATALKAN: StatusBooking = 'Cancelled'

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

/** Status yang boleh menerima pemicu `batalkan` menurut mesin status (sumber tunggal guard pembatalan, juga untuk SQL). */
export const STATUS_DAPAT_DIBATALKAN: readonly StatusBooking[] = DAFTAR_STATUS_BOOKING.filter(
  (s) => transisi(s, 'batalkan') !== null,
)

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

/** Kode tidak dikenal, termasuk kode milik orang lain (tidak membocorkan kode pemesan lain); wording US-5b/US-9. */
export const PESAN_KODE_TIDAK_DITEMUKAN = 'Kode booking reference tidak ditemukan'
/** Kondisi ekstensi 2a US-2b; dipakai juga sebagai alasan penolakan pembatalan di API. */
export const PESAN_TIDAK_DAPAT_DIBATALKAN = 'Pemesanan berstatus Cancelled atau waktu berangkatnya sudah lewat'

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

/** Bentuk Pemesanan yang diperiksa invarian: Penumpang dengan data wajibnya dan akun yang `mewakili`. */
export interface PemesananUntukInvarian {
  pemesanId: number
  penumpang: { akunId: number | null; data: DataWajibMentah }[]
}

/** inv DataPenumpangLengkap: self.penumpang->forAll(p | p.data.lengkap). `hariIni` untuk aturan tanggal lahir. */
export const memenuhiDataPenumpangLengkap = (
  p: { penumpang: { data: DataWajibMentah }[] },
  hariIni: string,
): boolean => p.penumpang.every((x) => lengkap(x.data, hariIni))

/**
 * inv PesananSendiri: bila pemesan adalah CalonPenumpang (Member juga, generalisasi), pemesanan punya tepat satu
 * Penumpang yang `mewakili` pemesan itu sendiri.
 */
export const memenuhiPesananSendiri = (p: PemesananUntukInvarian, peranPemesan: Peran): boolean =>
  !punyaPeran(peranPemesan, ['CalonPenumpang']) || (p.penumpang.length === 1 && p.penumpang[0]!.akunId === p.pemesanId)
