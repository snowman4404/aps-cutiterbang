// Control PengendaliPemesananPengunjung (US-8b, kontrak C2): manajer travel memesan untuk satu atau lebih pengunjung.
import {
  PESAN_PENGUNJUNG_TIDAK_TERDAFTAR,
  pesanProfilTidakLengkap,
  salinDataProfil,
  statusProfil,
  validasiDaftarPengunjung,
  type PengunjungDto,
  type TanggalIso,
  type TiketSaya,
} from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaPemesanan, PenumpangBaris } from './antarmukaPemesanan.ts'
import type { AntarmukaPengunjung } from './antarmukaPengunjung.ts'
import { buatPembuatPemesanan } from './pembuatPemesanan.ts'

export type HasilPesanUntukPengunjung =
  | { hasil: 'galat'; pesan: string }
  | { hasil: 'tidakDitemukan' }
  | { hasil: 'profilTidakLengkap'; pesan: string }
  | { hasil: 'habis'; pesan: string }
  | { hasil: 'berhasil'; pemesanan: TiketSaya }

export function buatPengendaliPemesananPengunjung(
  katalog: AntarmukaKatalogPenerbangan,
  data: AntarmukaPemesanan,
  pengunjung: AntarmukaPengunjung,
  hariIni: () => TanggalIso,
  sekarang: () => Date,
  acak: () => number = Math.random,
) {
  const pembuat = buatPembuatPemesanan(katalog, data, sekarang, acak)

  /** isiDataPenumpangDariProfil (langkah 2, 3): semua pengunjung terdaftar dengan data Profil dan statusProfil. */
  async function muatDaftarPengunjung(): Promise<PengunjungDto[]> {
    return (await pengunjung.semua()).map((v) => ({ ...v, status: statusProfil(v.data, hariIni()) }))
  }

  /**
   * pesanUntukPengunjung(f, daftarPengunjung) = kontrak C2. Urutan: daftar tidak kosong dan tanpa ganda (AC2, G7),
   * penerbangan ada, semua id adalah pengunjung terdaftar, statusProfil setiap pengunjung (5a, menyebut nama),
   * lalu periksa sisa kursi dan alokasiKursi(kode, jumlah) (5b, 7) dan Pemesanan(kode, f, pemesan) dengan satu
   * Penumpang(dataProfil, v) per pengunjung (6). Gagal = tidak ada yang dibuat dan sisa kursi tetap.
   */
  async function pesanUntukPengunjung(manajer: Akun, idPenerbangan: number, mentah: unknown): Promise<HasilPesanUntukPengunjung> {
    const daftar = validasiDaftarPengunjung(mentah)
    if ('pesan' in daftar) return { hasil: 'galat', pesan: daftar.pesan }

    const f = Number.isInteger(idPenerbangan) ? await katalog.ambilPenerbangan(idPenerbangan) : null
    if (!f) return { hasil: 'tidakDitemukan' }

    const terpilih = await pengunjung.denganId(daftar.ids)
    if (terpilih.length !== daftar.ids.length) return { hasil: 'galat', pesan: PESAN_PENGUNJUNG_TIDAK_TERDAFTAR }

    // 5, 5a: statusProfil setiap pengunjung; penumpang = salinan data Profil (AC3).
    const penumpang: PenumpangBaris[] = []
    const tidakLengkap: string[] = []
    for (const v of terpilih) {
      const salinan = salinDataProfil(v.data, hariIni())
      if (salinan) penumpang.push({ akunId: v.id, ...salinan })
      else tidakLengkap.push(v.nama)
    }
    if (tidakLengkap.length > 0) return { hasil: 'profilTidakLengkap', pesan: pesanProfilTidakLengkap(tidakLengkap) }

    return pembuat.buat(f, manajer, penumpang)
  }

  return { muatDaftarPengunjung, pesanUntukPengunjung }
}
