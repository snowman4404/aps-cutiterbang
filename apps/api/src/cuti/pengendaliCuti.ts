// Control PengendaliCuti: semua aturan cuti diterapkan di sini lewat fungsi domain; Antarmuka Data
// Kepegawaian hanya mengambil baris mentah.
import {
  cutiDisetujuiTahunIni,
  cutiTerpakai,
  lamaCuti,
  pengajuanPadaPeriode,
  PESAN_BELUM_ADA_RIWAYAT,
  PESAN_TIDAK_ADA_PENGAJUAN,
  punyaPeran,
  riwayatCuti,
  sisaCuti,
  tahunDari,
  validasiPeriode,
  type Periode,
  type Peran,
  type TanggalIso,
} from '@cutiterbang/domain'
import type { AntarmukaDataKepegawaian } from './antarmukaDataKepegawaian.ts'

export function buatPengendaliCuti(data: AntarmukaDataKepegawaian, hariIni: () => TanggalIso) {
  /** periksaPeran(akun): hanya HRDManajer yang boleh memakai modul Manajemen Cuti. */
  const periksaPeran = (akun: { peran: Peran }) => punyaPeran(akun.peran, ['HRDManajer'])

  /** ambilPengajuanBeririsan: Diajukan atau Disetujui yang beririsan dengan periode, tanggalMulai naik. */
  async function ambilPengajuanBeririsan(periode: Periode) {
    return pengajuanPadaPeriode(await data.ambilSemuaPengajuan(), periode)
  }

  /** ambilJatahDanCutiDisetujui(nip): pegawai + cuti Disetujui tahun ini. null = NIP tidak dikenal. */
  async function ambilJatahDanCutiDisetujui(nip: string, sekarang: TanggalIso) {
    const p = await data.cariPegawai(nip)
    if (!p) return null
    const [pengajuan, libur] = await Promise.all([data.ambilPengajuanPegawai(p.id), data.ambilHariLibur()])
    return { pegawai: p, disetujui: cutiDisetujuiTahunIni(pengajuan, sekarang), libur }
  }

  /** tampilkanPengajuan(mulai, akhir): US-1a. */
  async function tampilkanPengajuan(mulai: unknown, akhir: unknown) {
    const hasil = validasiPeriode({ mulai, akhir })
    if ('galat' in hasil) return { galat: hasil.galat }
    const [beririsan, libur] = await Promise.all([ambilPengajuanBeririsan(hasil.periode), data.ambilHariLibur()])
    const pengajuan = beririsan.map((p) => ({
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
    const sekarang = hariIni()
    const dasar = await ambilJatahDanCutiDisetujui(nip, sekarang)
    if (!dasar) return null
    const riwayat = riwayatCuti(dasar.disetujui, sekarang).map((c) => ({
      id: c.id,
      tanggalMulai: c.tanggalMulai,
      tanggalAkhir: c.tanggalAkhir,
      lamaCuti: lamaCuti(c, dasar.libur),
    }))
    return {
      pegawai: { nama: dasar.pegawai.nama, nomorIndukPegawai: dasar.pegawai.nomorIndukPegawai },
      tahun: tahunDari(sekarang),
      riwayat,
      ...(riwayat.length === 0 ? { pesan: PESAN_BELUM_ADA_RIWAYAT } : {}),
    }
  }

  /** tampilkanSisaCuti(nip): US-1c. null = NIP tidak dikenal. */
  async function tampilkanSisaCuti(nip: string) {
    const sekarang = hariIni()
    const dasar = await ambilJatahDanCutiDisetujui(nip, sekarang)
    if (!dasar) return null
    const { pegawai: p, disetujui, libur } = dasar
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

  return { periksaPeran, tampilkanPengajuan, muatDaftarPegawai, tampilkanRiwayat, tampilkanSisaCuti }
}
