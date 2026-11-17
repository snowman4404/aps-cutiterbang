// Control PengendaliStatusBooking (US-7 "Halaman Status Booking" dan US-9 "Formulir Pemeriksaan Kode"). Pemeriksaan peran
// (*a, periksaPeran) dilakukan penjaga rute /api/travel (G12); di sini hanya langkah-langkah use case.
import {
  filterStatusDariTeks,
  LABEL_STATUS_BOOKING,
  NILAI_SEMUA_STATUS,
  PESAN_FILTER_STATUS_TIDAK_SAH,
  PESAN_KODE_TIDAK_DITEMUKAN,
  ringkasanPenerbangan,
  validasiIsianKode,
  type BarisStatusBooking,
  type HasilCekKode,
} from '@cutiterbang/domain'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaPemesanan, PemesananBaris } from './antarmukaPemesanan.ts'

export type HasilDaftarStatus =
  /** Parameter status di luar lima pilihan filter. */
  | { hasil: 'galat'; pesan: string }
  /** Daftar kosong = 3a, pesannya ditampilkan halaman. */
  | { hasil: 'berhasil'; pemesanan: BarisStatusBooking[] }

export type HasilPeriksaKode =
  /** 2a: kolom kode kosong (kolom ditandai). */
  | { hasil: 'galat'; galat: { kode: string } }
  /** 4a: kode tidak terdaftar, tanpa data pemesanan. */
  | { hasil: 'tidakDitemukan'; pesan: string }
  | { hasil: 'berhasil'; status: HasilCekKode }

const keBaris = (b: PemesananBaris): BarisStatusBooking => ({
  kode: b.kode,
  penumpang: b.penumpang.map((p) => p.namaLengkap),
  status: b.status,
  label: LABEL_STATUS_BOOKING[b.status],
})

export function buatPengendaliStatusBooking(katalog: AntarmukaKatalogPenerbangan, data: AntarmukaPemesanan) {
  /**
   * US-7: `semuaMenurutWaktuDibuat` (langkah 1, ekstensi 2a "Semua status") atau `denganStatus` (langkah 3); baris memuat kode
   * booking reference, nama semua penumpang dan status booking. Semua pemesanan terlihat (US-2a dan US-8b).
   */
  async function daftarStatus(statusMentah: unknown): Promise<HasilDaftarStatus> {
    const filter = filterStatusDariTeks(statusMentah)
    if (filter === null) return { hasil: 'galat', pesan: PESAN_FILTER_STATUS_TIDAK_SAH }
    const baris = filter === NILAI_SEMUA_STATUS ? await data.semuaMenurutWaktuDibuat() : await data.denganStatus(filter)
    return { hasil: 'berhasil', pemesanan: baris.map(keBaris) }
  }

  /** US-9 periksaKode(kode): validasiIsianKode (2), normal() (3, di `cariDenganKode`), cariDenganKode (4), status/ringkasanPenerbangan (5). */
  async function periksaKode(kodeMentah: unknown): Promise<HasilPeriksaKode> {
    const isian = validasiIsianKode(kodeMentah)
    if ('galat' in isian) return { hasil: 'galat', galat: isian.galat }
    const b = await data.cariDenganKode(isian.kode)
    if (!b) return { hasil: 'tidakDitemukan', pesan: PESAN_KODE_TIDAK_DITEMUKAN }
    const f = (await katalog.ambilPenerbangan(b.penerbanganId))!
    return { hasil: 'berhasil', status: { ...keBaris(b), ...ringkasanPenerbangan(f) } }
  }

  return { daftarStatus, periksaKode }
}
