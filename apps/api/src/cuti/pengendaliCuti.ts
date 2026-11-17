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
    const m = (mulai as string).trim()
    const a = (akhir as string).trim()
    const [beririsan, libur] = await Promise.all([data.ambilPengajuanBeririsan(m, a), data.ambilHariLibur()])
    const pengajuan = urutkanDariTanggalMulaiPalingAwal(beririsan).map((p) => ({
      id: p.id,
      namaPegawai: p.nama,
      nomorIndukPegawai: p.nomorIndukPegawai,
      tanggalMulai: p.tanggalMulai,
      tanggalAkhir: p.tanggalAkhir,
      lamaCuti: lamaCuti(p, libur),
      status: p.status,
    }))
    return { pengajuan, ...(pengajuan.length === 0 ? { pesan: PESAN_TIDAK_ADA_PENGAJUAN } : {}) }
  }

  /** muatDaftarPegawai: US-1b/1c langkah 1. */
  const muatDaftarPegawai = async () => ({ pegawai: await data.ambilDaftarPegawai() })

  /** tampilkanRiwayat(nip): US-1b. null = NIP tidak dikenal. */
  async function tampilkanRiwayat(nip: string) {
    const p = await data.cariPegawai(nip)
    if (!p) return null
    const tahun = tahunDari(hariIni())
    const [disetujui, libur] = await Promise.all([data.ambilCutiDisetujui(p.id, tahun), data.ambilHariLibur()])
    const riwayat = urutkanDariPalingBaru(disetujui).map((c) => ({
      tanggalMulai: c.tanggalMulai,
      tanggalAkhir: c.tanggalAkhir,
      lamaCuti: lamaCuti(c, libur),
    }))
    return {
      pegawai: { nama: p.nama, nomorIndukPegawai: p.nomorIndukPegawai },
      tahun,
      riwayat,
      ...(riwayat.length === 0 ? { pesan: PESAN_BELUM_ADA_RIWAYAT } : {}),
    }
  }

  /** tampilkanSisaCuti(nip): US-1c (ambilJatahDanCutiDisetujui). null = NIP tidak dikenal. */
  async function tampilkanSisaCuti(nip: string) {
    const p = await data.cariPegawai(nip)
    if (!p) return null
    const sekarang = hariIni()
    const [disetujui, libur] = await Promise.all([
      data.ambilCutiDisetujui(p.id, tahunDari(sekarang)),
      data.ambilHariLibur(),
    ])
    const sisa = sisaCuti(p.jatahCutiTahunan, disetujui, sekarang, libur)
    return {
      pegawai: { nama: p.nama, nomorIndukPegawai: p.nomorIndukPegawai },
      tahun: tahunDari(sekarang),
      jatahCutiTahunan: p.jatahCutiTahunan,
      cutiTerpakai: cutiTerpakai(disetujui, sekarang, libur),
      sisaCuti: sisa,
      melebihiJatah: sisa < 0,
    }
  }

  return { tampilkanPengajuan, muatDaftarPegawai, tampilkanRiwayat, tampilkanSisaCuti }
}
