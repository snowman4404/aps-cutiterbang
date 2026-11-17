import type { StatusPengajuanCuti } from '@cutiterbang/domain'
import type { VarianPill } from '../ui/index.ts'

const FORMAT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "2026-12-29" -> "29 Des 2026". */
export const formatTanggal = (iso: string) => FORMAT.format(new Date(`${iso}T00:00:00Z`))

export const formatLama = (n: number) => `${n} hari kerja`

export const VARIAN_STATUS: Record<StatusPengajuanCuti, VarianPill> = {
  Diajukan: 'warning',
  Disetujui: 'positive',
  Ditolak: 'negative',
}

export interface PegawaiRingkas {
  nama: string
  nomorIndukPegawai: string
}
