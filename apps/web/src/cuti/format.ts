import type { StatusPengajuanCuti } from '@cutiterbang/domain'
import type { VarianPill } from '../ui/index.ts'

export const formatLama = (jumlah: number) => `${jumlah} hari kerja`

/** Record penuh: menambah status baru tanpa varian = galat kompilasi. */
export const VARIAN_STATUS: Record<StatusPengajuanCuti, VarianPill> = {
  Diajukan: 'warning',
  Disetujui: 'positive',
  Ditolak: 'negative',
}
