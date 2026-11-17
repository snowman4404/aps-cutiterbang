import type { StatusPengajuanCuti } from '@cutiterbang/domain'
import type { VarianPill } from '../ui/index.ts'

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
