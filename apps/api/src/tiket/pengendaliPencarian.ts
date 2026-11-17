// Control PengendaliPencarian (US-3, tanpa login).
import {
  cocok,
  PESAN_ASAL_TIDAK_DIKENAL,
  PESAN_TUJUAN_TIDAK_DIKENAL,
  sisaKursi,
  urutkanMenurutWaktuBerangkat,
  validasiIsianPencarian,
  type GalatPencarian,
  type TanggalIso,
} from '@cutiterbang/domain'
import { jumlahPenumpangAktif, type AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'

export function buatPengendaliPencarian(
  data: AntarmukaKatalogPenerbangan,
  hariIni: () => TanggalIso,
  sekarang: () => Date,
) {
  /** muatDaftarKota: US-3 langkah 1. */
  const muatDaftarKota = async () => ({ kota: await data.ambilDaftarKota() })

  /** cariPenerbangan(asal, tujuan, tanggal): validasiIsian -> cocok -> urutkanMenurutWaktuBerangkat. Daftar kosong = tidak ditemukan. */
  async function cariPenerbangan(asal: unknown, tujuan: unknown, tanggal: unknown) {
    const galat: GalatPencarian = validasiIsianPencarian({ asal, tujuan, tanggal }, hariIni())
    const idAsal = Number(String(asal ?? '').trim())
    const idTujuan = Number(String(tujuan ?? '').trim())
    if (!galat.asal || !galat.tujuan) {
      // Kota yang dipilih harus ada dalam daftar kota yang dilayani.
      const ids = new Set((await data.ambilDaftarKota()).map((k) => k.id))
      if (!galat.asal && !ids.has(idAsal)) galat.asal = PESAN_ASAL_TIDAK_DIKENAL
      if (!galat.tujuan && !ids.has(idTujuan)) galat.tujuan = PESAN_TUJUAN_TIDAK_DIKENAL
    }
    if (Object.keys(galat).length > 0) return { galat }

    const tgl = (tanggal as string).trim()
    const sekarangIni = sekarang()
    const kandidat = await data.ambilPenerbanganRute(idAsal, idTujuan, tgl)
    const dengan = await Promise.all(kandidat.map(async (f) => ({ f, aktif: await jumlahPenumpangAktif(f.id) })))
    const aktifPerId = new Map(dengan.map(({ f, aktif }) => [f.id, aktif]))
    const cocokSemua = dengan
      .filter(({ f, aktif }) => cocok(f, { asalId: idAsal, tujuanId: idTujuan, tanggal: tgl }, sekarangIni, aktif))
      .map(({ f }) => f)
    const penerbangan = urutkanMenurutWaktuBerangkat(cocokSemua).map((f) => ({
      id: f.id,
      maskapai: f.maskapai,
      nomorPenerbangan: f.nomorPenerbangan,
      asal: f.asal,
      tujuan: f.tujuan,
      tanggalKeberangkatan: f.tanggalKeberangkatan,
      waktuBerangkat: f.waktuBerangkat,
      waktuTiba: f.waktuTiba,
      harga: f.harga,
      sisaKursi: sisaKursi(f.jumlahKursi, aktifPerId.get(f.id)!),
    }))
    return { penerbangan }
  }

  return { muatDaftarKota, cariPenerbangan }
}
