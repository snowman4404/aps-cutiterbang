// Control PengendaliValidasiTiket (US-5b, kontrak C4): validasiIsianKode, statusProfil, cariDenganKode, cocokDengan,
// catatPerjalanan, tampilkanHasil. Urutan pemeriksaan = urutan langkah: 2, 3, 4, 5, 6, 7-8.
import {
  cocokDengan,
  PESAN_PROFIL_TIDAK_LENGKAP,
  PESAN_TIKET_BELUM_TERKONFIRMASI,
  PESAN_TIKET_SUDAH_TERVALIDASI,
  PESAN_TIKET_TIDAK_COCOK,
  PESAN_KODE_TIDAK_DITEMUKAN,
  statusProfil,
  validasiIsianKode,
  type HasilValidasiTiket,
  type PerjalananTercatat,
  type TanggalIso,
} from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaPemesanan, PemesananBaris } from './antarmukaPemesanan.ts'
import type { AntarmukaPerjalananTercatat } from './antarmukaPerjalananTercatat.ts'
import type { AntarmukaProfil } from './antarmukaProfil.ts'
import { keInformasiPenerbangan } from './tiketSaya.ts'

export type HasilValidasi =
  /** 2a: kolom kode kosong (kolom ditandai). */
  | { hasil: 'galat'; galat: { kode: string } }
  /** 3a, 4a, 5a: validasi ditolak dengan pesan spesifikasi. */
  | { hasil: 'ditolak'; sebab: 'profilTidakLengkap' | 'tidakDitemukan' | 'belumTerkonfirmasi'; pesan: string }
  /** 6a (tidak valid) atau 7 dan 8a (valid). */
  | { hasil: 'selesai'; validasi: HasilValidasiTiket }

export function buatPengendaliValidasiTiket(
  katalog: AntarmukaKatalogPenerbangan,
  pemesanan: AntarmukaPemesanan,
  profil: AntarmukaProfil,
  perjalanan: AntarmukaPerjalananTercatat,
  hariIni: () => TanggalIso,
  sekarang: () => Date,
) {
  async function keRingkasan(daftar: PemesananBaris[]): Promise<PerjalananTercatat[]> {
    const ids = [...new Set(daftar.map((b) => b.penerbanganId))]
    const [terbang, aktif] = await Promise.all([katalog.ambilPenerbanganUntuk(ids), katalog.jumlahPenumpangAktif(ids)])
    return daftar.map((b) => {
      const f = terbang.get(b.penerbanganId)!
      return { kode: b.kode, status: b.status, penerbangan: keInformasiPenerbangan(f, aktif.get(f.id) ?? 0, sekarang()) }
    })
  }

  /** validasiTiket(kode) (kontrak C4). Pemeriksaan profil (3a) mendahului pencarian kode (4). */
  async function validasiTiket(akun: Pick<Akun, 'id'>, kodeMentah: unknown): Promise<HasilValidasi> {
    const isian = validasiIsianKode(kodeMentah) // 2
    if ('galat' in isian) return { hasil: 'galat', galat: isian.galat }

    const data = await profil.ambil(akun.id)
    if (statusProfil(data, hariIni()) !== 'lengkap') // 3
      return { hasil: 'ditolak', sebab: 'profilTidakLengkap', pesan: PESAN_PROFIL_TIDAK_LENGKAP }

    const b = await pemesanan.cariDenganKode(isian.kode) // 4: semua Pemesanan, kode dinormalisasi
    if (!b) return { hasil: 'ditolak', sebab: 'tidakDitemukan', pesan: PESAN_KODE_TIDAK_DITEMUKAN }

    if (b.status !== 'Confirmed') // 5
      return { hasil: 'ditolak', sebab: 'belumTerkonfirmasi', pesan: PESAN_TIKET_BELUM_TERKONFIRMASI }

    // 6: tidak cocok = "tidak valid"; data penumpang tidak pernah ikut ke hasil.
    if (!cocokDengan(b.penumpang, data)) return { hasil: 'selesai', validasi: { hasil: 'tidakValid', pesan: PESAN_TIKET_TIDAK_COCOK } }

    const catat = await perjalanan.catatPerjalanan(akun.id, b.id, 'Confirmed') // 7, 8, 8a
    // Dibatalkan tepat di antara langkah 5 dan 8: sama dengan status bukan Confirmed (5a).
    if (catat === 'tidakBisa') return { hasil: 'ditolak', sebab: 'belumTerkonfirmasi', pesan: PESAN_TIKET_BELUM_TERKONFIRMASI }
    const [ringkas] = await keRingkasan([b])
    return {
      hasil: 'selesai',
      validasi: {
        hasil: 'valid',
        sudahTercatat: catat === 'sudah',
        ...(catat === 'sudah' ? { pesan: PESAN_TIKET_SUDAH_TERVALIDASI } : {}),
        perjalanan: ringkas!,
      },
    }
  }

  /** perjalananTercatat milik member: Pemesanan yang pernah divalidasi dan belum dibatalkan (G8), terbaru dulu. */
  async function muatPerjalananTercatat(akun: Pick<Akun, 'id'>): Promise<PerjalananTercatat[]> {
    return keRingkasan(await pemesanan.denganId(await perjalanan.idPemesanan(akun.id)))
  }

  return { validasiTiket, muatPerjalananTercatat }
}
