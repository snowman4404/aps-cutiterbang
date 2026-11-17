import { singkatanZona, type StatusBooking, type StatusProfil, type ZonaWaktu } from '@cutiterbang/domain'
import type { VarianPill } from '../ui/index.ts'

const FORMAT_RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

/** 1250000 -> "Rp 1.250.000". */
export const formatHarga = (rupiah: number) => FORMAT_RUPIAH.format(rupiah)

/** "08:30" + "Asia/Jakarta" -> "08:30 WIB". */
export const formatWaktu = (waktu: string, zona: ZonaWaktu) => `${waktu} ${singkatanZona(zona)}`

/** Pill StatusBooking: WaitingForThePayment = warning, Booked = accent, Confirmed = positive, Cancelled = neutral. */
export const VARIAN_STATUS_BOOKING: Record<StatusBooking, VarianPill> = {
  WaitingForThePayment: 'warning',
  Booked: 'accent',
  Confirmed: 'positive',
  Cancelled: 'neutral',
}

/** Pill StatusProfil: lengkap = positive, tidakLengkap = warning. */
export const VARIAN_STATUS_PROFIL: Record<StatusProfil, VarianPill> = {
  lengkap: 'positive',
  tidakLengkap: 'warning',
}

const FORMAT_WAKTU_KIRIM = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })

/** Instan ISO (UTC) -> "18 Nov 2026 08.00 WIB" (waktu server WIB, G1). */
export const formatWaktuKirim = (iso: string) => `${FORMAT_WAKTU_KIRIM.format(new Date(iso))} WIB`
