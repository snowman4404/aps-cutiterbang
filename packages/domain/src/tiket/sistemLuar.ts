import { LABEL_STATUS_BOOKING, type PemicuBooking, type StatusBooking } from './pemesanan.ts'

// Sistem luar yang disimulasikan (di luar lingkup, asumsi 4): pembayaran dan maskapai mengubah status booking. Murni, tanpa I/O.

export type SistemLuar = 'pembayaran' | 'maskapai'

/** Satu baris mesin status per sistem luar: status asal yang menerima pemicunya. Tes menjaga kesesuaiannya dengan `transisi`. */
export const TRANSISI_SISTEM_LUAR: Record<SistemLuar, { dari: StatusBooking; pemicu: PemicuBooking }> = {
  pembayaran: { dari: 'WaitingForThePayment', pemicu: 'pembayaranBerhasil' },
  maskapai: { dari: 'Booked', pemicu: 'konfirmasiMaskapai' },
}

/** Sistem luar yang bisa memicu transisi dari status ini (simulator demo), atau null. */
export const sistemLuarUntuk = (status: StatusBooking): SistemLuar | null =>
  (Object.keys(TRANSISI_SISTEM_LUAR) as SistemLuar[]).find((s) => TRANSISI_SISTEM_LUAR[s].dari === status) ?? null

/** Tidak ada teks spesifikasi: pemicu sistem luar pada status yang tidak mengizinkannya. */
export const pesanTransisiTidakSah = (status: StatusBooking): string =>
  `Status booking ${LABEL_STATUS_BOOKING[status]} tidak dapat diubah oleh simulasi ini`

/** Ringkasan satu pemesanan dari sistem luar. */
export interface HasilSimulasi {
  kode: string
  status: StatusBooking
  label: string
}
