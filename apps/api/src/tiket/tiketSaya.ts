// Pemetaan Pemesanan -> baris "Tiket Saya" dan informasi penerbangan; dipakai PengendaliPemesanan dan PengendaliPembatalan.
import {
  dapatDibatalkanPada,
  etiketBerlaku,
  LABEL_STATUS_BOOKING,
  punyaPeran,
  tersedia,
  type InformasiPenerbangan,
  type TiketSaya,
} from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import { keHasilPencarian, type AntarmukaKatalogPenerbangan, type PenerbanganLengkap } from './antarmukaKatalogPenerbangan.ts'
import type { PemesananBaris } from './antarmukaPemesanan.ts'

/** informasiPenerbangan: baris hasil pencarian + /tersedia. */
export const keInformasiPenerbangan = (f: PenerbanganLengkap, penumpangAktif: number, sekarang: Date): InformasiPenerbangan => ({
  ...keHasilPencarian(f, penumpangAktif),
  tersedia: tersedia(f, sekarang, penumpangAktif),
})

/**
 * Baris Tiket Saya untuk `akun`. `dapatDibatalkan` hanya benar bila akun adalah Calon Penumpang pemesannya (G4: pemesanan
 * Manajer Travel tidak dapat dibatalkan siapa pun) dan
 * Pemesanan.dapatDibatalkan() berlaku (belum Cancelled, belum berangkat menurut waktu setempat, G1).
 */
export async function muatTiketSaya(
  katalog: AntarmukaKatalogPenerbangan,
  baris: PemesananBaris[],
  akun: Pick<Akun, 'id' | 'peran'>,
  sekarang: Date,
): Promise<TiketSaya[]> {
  const ids = [...new Set(baris.map((b) => b.penerbanganId))]
  const [penerbangan, aktif] = await Promise.all([katalog.ambilPenerbanganUntuk(ids), katalog.jumlahPenumpangAktif(ids)])
  return baris.map((b) => {
    const f = penerbangan.get(b.penerbanganId)!
    return {
      kode: b.kode,
      status: b.status,
      label: LABEL_STATUS_BOOKING[b.status],
      waktuDibuat: b.waktuDibuat.toISOString(),
      dapatDibatalkan: b.pemesanId === akun.id && punyaPeran(akun.peran, ['CalonPenumpang']) && dapatDibatalkanPada(b.status, f, sekarang),
      penumpang: b.penumpang.map((p) => p.namaLengkap),
      penerbangan: keInformasiPenerbangan(f, aktif.get(f.id) ?? 0, sekarang),
      // G5: e-tiket tetap tampil setelah Cancelled, tetapi `berlaku` salah (void).
      eTiket: b.eTiket && { nomor: b.eTiket.nomor, waktuTerbit: b.eTiket.waktuTerbit.toISOString(), berlaku: etiketBerlaku(b.status) },
    }
  })
}
