// Control PengendaliCuti (periksaPeran dilakukan oleh middleware `butuhPeran('HRDManajer')`).
import {
  lamaCuti,
  PESAN_BELUM_ADA_RIWAYAT,
  PESAN_TIDAK_ADA_PENGAJUAN,
  sisaCuti,
  tahunDari,
  urutkanDariPalingBaru,
  urutkanDariTanggalMulaiPalingAwal,
  validasiPeriode,
  cutiTerpakai,
  type GalatPeriode,
  type TanggalIso,
} from '@cutiterbang/domain'
import type { AntarmukaDataKepegawaian } from './antarmukaDataKepegawaian.ts'

export function buatPengendaliCuti(data: AntarmukaDataKepegawaian, hariIni: () => TanggalIso) {
  /** tampilkanPengajuan(mulai, akhir): US-1a. */
  async function tampilkanPengajuan(mulai: unknown, akhir: unknown) {
    const galat: GalatPeriode = validasiPeriode({ mulai, akhir })
    if (Object.keys(galat).length > 0) return { galat }
    const mulaiRapi = (mulai as string).trim()
    const akhirRapi = (akhir as string).trim()
    const [beririsan, libur] = await Promise.all([data.ambilPengajuanBeririsan(mulaiRapi, akhirRapi), data.ambilHariLibur()])
    const pengajuan = urutkanDariTanggalMulaiPalingAwal(beririsan).map((baris) => ({
      id: baris.id,
      namaPegawai: baris.nama,
      nomorIndukPegawai: baris.nomorIndukPegawai,
      tanggalMulai: baris.tanggalMulai,
      tanggalAkhir: baris.tanggalAkhir,
      lamaCuti: lamaCuti(baris, libur),
      status: baris.status,
    }))
    return { pengajuan, ...(pengajuan.length === 0 ? { pesan: PESAN_TIDAK_ADA_PENGAJUAN } : {}) }
  }

  /** muatDaftarPegawai: US-1b/1c langkah 1. */
  const muatDaftarPegawai = async () => ({ pegawai: await data.ambilDaftarPegawai() })

  /** tampilkanRiwayat(nip): US-1b. null = NIP tidak dikenal. */
  async function tampilkanRiwayat(nip: string) {
    const dataPegawai = await data.cariPegawai(nip)
    if (!dataPegawai) return null
    const tahun = tahunDari(hariIni())
    const [disetujui, libur] = await Promise.all([data.ambilCutiDisetujui(dataPegawai.id, tahun), data.ambilHariLibur()])
    const riwayat = urutkanDariPalingBaru(disetujui).map((cuti) => ({
      tanggalMulai: cuti.tanggalMulai,
      tanggalAkhir: cuti.tanggalAkhir,
      lamaCuti: lamaCuti(cuti, libur),
    }))
    return {
      pegawai: { nama: dataPegawai.nama, nomorIndukPegawai: dataPegawai.nomorIndukPegawai },
      tahun,
      riwayat,
      ...(riwayat.length === 0 ? { pesan: PESAN_BELUM_ADA_RIWAYAT } : {}),
    }
  }

  /** tampilkanSisaCuti(nip): US-1c (ambilJatahDanCutiDisetujui). null = NIP tidak dikenal. */
  async function tampilkanSisaCuti(nip: string) {
    const dataPegawai = await data.cariPegawai(nip)
    if (!dataPegawai) return null
    const sekarang = hariIni()
    const [disetujui, libur] = await Promise.all([
      data.ambilCutiDisetujui(dataPegawai.id, tahunDari(sekarang)),
      data.ambilHariLibur(),
    ])
    const sisa = sisaCuti(dataPegawai.jatahCutiTahunan, disetujui, sekarang, libur)
    return {
      pegawai: { nama: dataPegawai.nama, nomorIndukPegawai: dataPegawai.nomorIndukPegawai },
      tahun: tahunDari(sekarang),
      jatahCutiTahunan: dataPegawai.jatahCutiTahunan,
      cutiTerpakai: cutiTerpakai(disetujui, sekarang, libur),
      sisaCuti: sisa,
      melebihiJatah: sisa < 0,
    }
  }

  return { tampilkanPengajuan, muatDaftarPegawai, tampilkanRiwayat, tampilkanSisaCuti }
}
