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

/** Satu baris panel simulator demo: pemesanan apa pun beserta sistem luar yang bisa memicunya sekarang (null = tidak ada). */
export interface BarisSimulator {
  kode: string
  /** Label peran pemesan (Calon Penumpang, Member Frequent Traveller atau Manajer Travel). */
  pemesan: string
  penumpang: string[]
  status: StatusBooking
  label: string
  sistem: SistemLuar | null
}

/** Satu email di kotak keluar Layanan Email (simulasi), untuk panel simulator demo. */
export interface EmailKotakKeluar {
  kode: string
  kepada: string
  subjek: string
  isi: string
  /** Instan kirim, ISO 8601 UTC. */
  waktuKirim: string
}

/** GET /api/simulasi: semua pemesanan (terbaru dulu) dan seluruh kotak keluar email (terbaru dulu). */
export interface RingkasanSimulator {
  pemesanan: BarisSimulator[]
  email: EmailKotakKeluar[]
}

/** Tidak ada teks spesifikasi: simulator dimatikan (produksi tanpa IZINKAN_RESET=1). */
export const PESAN_SIMULATOR_TIDAK_AKTIF = 'Simulator demo tidak aktif di lingkungan ini'
