import { singkatanZona } from '@cutiterbang/domain'

const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const FORMAT_RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

/** "2026-12-29" -> "Sel, 29 Des 2026". */
export const formatTanggal = (iso: string) => FORMAT_TANGGAL.format(new Date(`${iso}T00:00:00Z`))

/** 1250000 -> "Rp 1.250.000". */
export const formatHarga = (rupiah: number) => FORMAT_RUPIAH.format(rupiah)

/** "08:30" + "Asia/Jakarta" -> "08:30 WIB". */
export const formatWaktu = (waktu: string, zona: string) => `${waktu} ${singkatanZona(zona)}`

export interface KotaPilihan {
  id: number
  nama: string
  zonaWaktu: string
}

export interface HasilPenerbangan {
  id: number
  maskapai: string
  nomorPenerbangan: string
  asal: KotaPilihan
  tujuan: KotaPilihan
  tanggalKeberangkatan: string
  waktuBerangkat: string
  waktuTiba: string
  harga: number
  sisaKursi: number
}
