import { singkatanZona, type ZonaWaktu } from '@cutiterbang/domain'

const FORMAT_RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

/** 1250000 -> "Rp 1.250.000". */
export const formatHarga = (rupiah: number) => FORMAT_RUPIAH.format(rupiah)

/** "08:30" + "Asia/Jakarta" -> "08:30 WIB". */
export const formatWaktu = (waktu: string, zona: ZonaWaktu) => `${waktu} ${singkatanZona(zona)}`
