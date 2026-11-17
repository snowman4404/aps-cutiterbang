import type { DaftarHariLibur } from './kalenderKerja.ts'
import { lamaCuti, urutkanDariPalingBaru, type PengajuanCuti } from './pengajuanCuti.ts'
import { tahunDari, type TanggalIso } from '../umum/tanggal.ts'

export interface Pegawai {
  nama: string
  nomorIndukPegawai: string
  jatahCutiTahunan: number
}

/**
 * cutiDisetujuiTahunIni: status Disetujui dan tahun tanggalMulai = tahun `hariIni`.
 * G9: cuti yang melewati 31 Des dihitung penuh ke tahun tanggalMulai.
 */
export const cutiDisetujuiTahunIni = <T extends PengajuanCuti>(daftar: readonly T[], hariIni: TanggalIso): T[] =>
  daftar.filter((p) => p.status === 'Disetujui' && tahunDari(p.tanggalMulai) === tahunDari(hariIni))

/** riwayatCuti: cutiDisetujuiTahunIni, tanggalMulai menurun. */
export const riwayatCuti = <T extends PengajuanCuti>(daftar: readonly T[], hariIni: TanggalIso): T[] =>
  urutkanDariPalingBaru(cutiDisetujuiTahunIni(daftar, hariIni))

/** Hari kerja terpakai tahun ini. */
export const cutiTerpakai = (daftar: readonly PengajuanCuti[], hariIni: TanggalIso, libur: DaftarHariLibur) =>
  cutiDisetujuiTahunIni(daftar, hariIni).reduce((jumlah, p) => jumlah + lamaCuti(p, libur), 0)

/** /sisaCuti = jatahCutiTahunan - jumlah lamaCuti cutiDisetujuiTahunIni. Boleh negatif (G9). */
export const sisaCuti = (
  jatahCutiTahunan: number,
  daftar: readonly PengajuanCuti[],
  hariIni: TanggalIso,
  libur: DaftarHariLibur,
) => jatahCutiTahunan - cutiTerpakai(daftar, hariIni, libur)
