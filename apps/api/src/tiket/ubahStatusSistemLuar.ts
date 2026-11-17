// Perubahan status booking oleh sistem luar yang disimulasikan: Antarmuka Pembayaran (pembayaranBerhasil -> Booked) dan
// Antarmuka Maskapai (konfirmasiKursi -> Confirmed, lewat PengendaliETiket). Mesin status (domain `transisi`) memutuskan
// boleh atau tidak; SQL menjaga perubahan secara atomik bersama efek masuknya dalam satu batch.
import {
  LABEL_STATUS_BOOKING,
  PESAN_KODE_TIDAK_DITEMUKAN,
  pesanTransisiTidakSah,
  TRANSISI_SISTEM_LUAR,
  transisi,
  type HasilSimulasi,
  type SistemLuar,
} from '@cutiterbang/domain'
import type { AntarmukaPemesanan, PemesananBaris, PernyataanBatch } from './antarmukaPemesanan.ts'

export type HasilUbahStatus =
  | { hasil: 'berhasil'; pemesanan: HasilSimulasi }
  | { hasil: 'tidakDitemukan'; pesan: string }
  | { hasil: 'tidakBisa'; pesan: string }

/**
 * ubahStatus(kode) oleh `sistem`: kode tidak dikenal = tidakDitemukan; transisi yang tidak sah (atau status yang berubah di
 * antara pembacaan dan penulisan) = tidakBisa. `efekMasuk` menyiapkan pernyataan yang ikut batch status (mis. e-tiket).
 */
export async function ubahStatusSistemLuar(
  data: AntarmukaPemesanan,
  sistem: SistemLuar,
  kode: string,
  efekMasuk: (b: PemesananBaris) => Promise<PernyataanBatch[]> = async () => [],
): Promise<HasilUbahStatus> {
  const b = await data.cariDenganKode(kode)
  if (!b) return { hasil: 'tidakDitemukan', pesan: PESAN_KODE_TIDAK_DITEMUKAN }
  const { dari, pemicu } = TRANSISI_SISTEM_LUAR[sistem]
  const baru = transisi(b.status, pemicu)
  if (baru === null) return { hasil: 'tidakBisa', pesan: pesanTransisiTidakSah(b.status) }
  if (!(await data.ubahStatus(b.kode, dari, baru, await efekMasuk(b)))) {
    const statusSekarang = (await data.cariDenganKode(b.kode))?.status ?? b.status
    return { hasil: 'tidakBisa', pesan: pesanTransisiTidakSah(statusSekarang) }
  }
  return { hasil: 'berhasil', pemesanan: { kode: b.kode, status: baru, label: LABEL_STATUS_BOOKING[baru] } }
}
