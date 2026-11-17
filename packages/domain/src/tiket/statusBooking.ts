import { DAFTAR_STATUS_BOOKING, LABEL_STATUS_BOOKING, transisi, type PemicuBooking, type StatusBooking } from './pemesanan.ts'

// US-7 (memantau status booking), US-9 (memeriksa kode) dan simulator sistem luar. Murni, tanpa I/O.

/** US-7 ekstensi 3a. */
export const PESAN_TIDAK_ADA_PEMESANAN = 'Tidak ada pemesanan dengan status ini'
/** Tidak ada teks spesifikasi: parameter status di luar lima pilihan filter. */
export const PESAN_FILTER_STATUS_TIDAK_SAH = 'Status booking tidak dikenal'

/** Pilihan filter US-7: lima pilihan (variasi data); "Semua status" = tanpa filter (ekstensi 2a). */
export const NILAI_SEMUA_STATUS = 'semua'
export const LABEL_SEMUA_STATUS = 'Semua status'
export type FilterStatus = StatusBooking | typeof NILAI_SEMUA_STATUS

export const PILIHAN_FILTER_STATUS: readonly { nilai: FilterStatus; label: string }[] = [
  { nilai: NILAI_SEMUA_STATUS, label: LABEL_SEMUA_STATUS },
  ...DAFTAR_STATUS_BOOKING.map((s) => ({ nilai: s, label: LABEL_STATUS_BOOKING[s] })),
]

/** Filter dari teks parameter: kosong atau tidak ada = "Semua status"; null bila bukan salah satu pilihan. */
export function filterStatusDariTeks(teks: unknown): FilterStatus | null {
  if (teks === undefined || teks === null || teks === '') return NILAI_SEMUA_STATUS
  if (typeof teks !== 'string') return null
  if (teks === NILAI_SEMUA_STATUS) return NILAI_SEMUA_STATUS
  return DAFTAR_STATUS_BOOKING.find((s) => s === teks) ?? null
}

/** Satu baris US-7 (langkah 1): kode booking reference, nama semua penumpang dan status booking. */
export interface BarisStatusBooking {
  kode: string
  penumpang: string[]
  status: StatusBooking
  label: string
}

/** Hasil US-9 (langkah 5): status booking, nama semua penumpang, nomor penerbangan dan tanggal keberangkatan. */
export interface HasilCekKode {
  kode: string
  status: StatusBooking
  label: string
  penumpang: string[]
  nomorPenerbangan: string
  tanggalKeberangkatan: string
}

/** Sistem luar yang disimulasikan: pembayaran (WaitingForThePayment -> Booked) dan maskapai (Booked -> Confirmed). */
export type SistemLuar = 'pembayaran' | 'maskapai'

export const PEMICU_SISTEM_LUAR: Record<SistemLuar, PemicuBooking> = {
  pembayaran: 'pembayaranBerhasil',
  maskapai: 'konfirmasiMaskapai',
}

/** Status yang boleh menerima pemicu sistem luar menurut mesin status (satu status per pemicu). */
export const statusAsal = (sistem: SistemLuar): StatusBooking =>
  DAFTAR_STATUS_BOOKING.find((s) => transisi(s, PEMICU_SISTEM_LUAR[sistem]) !== null)!

/** Tidak ada teks spesifikasi: pemicu sistem luar pada status yang tidak mengizinkannya. */
export const pesanTransisiTidakSah = (status: StatusBooking): string =>
  `Status booking ${LABEL_STATUS_BOOKING[status]} tidak dapat diubah oleh simulasi ini`

/** Ringkasan satu pemesanan dari sistem luar. */
export interface HasilSimulasi {
  kode: string
  status: StatusBooking
  label: string
}
