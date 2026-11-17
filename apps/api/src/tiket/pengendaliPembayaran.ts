// Control untuk Antarmuka Pembayaran (sistem luar, disimulasikan): pembayaranBerhasil(kode) = ubahStatus(Booked).
// Mesin status (domain `transisi`) memutuskan boleh atau tidak; SQL menjaga perubahan secara atomik.
import {
  LABEL_STATUS_BOOKING,
  PEMICU_SISTEM_LUAR,
  PESAN_KODE_TIDAK_DITEMUKAN,
  pesanTransisiTidakSah,
  statusAsal,
  transisi,
} from '@cutiterbang/domain'
import type { AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import type { HasilUbahStatus } from './pengendaliETiket.ts'

export function buatPengendaliPembayaran(data: AntarmukaPemesanan) {
  async function pembayaranBerhasil(kode: string): Promise<HasilUbahStatus> {
    const b = await data.cariDenganKode(kode)
    if (!b) return { hasil: 'tidakDitemukan', pesan: PESAN_KODE_TIDAK_DITEMUKAN }
    const baru = transisi(b.status, PEMICU_SISTEM_LUAR.pembayaran)
    if (baru === null) return { hasil: 'tidakBisa', pesan: pesanTransisiTidakSah(b.status) }
    if (!(await data.ubahStatus(b.kode, statusAsal('pembayaran'), baru))) {
      const statusSekarang = (await data.cariDenganKode(b.kode))?.status ?? b.status
      return { hasil: 'tidakBisa', pesan: pesanTransisiTidakSah(statusSekarang) }
    }
    return { hasil: 'berhasil', pemesanan: { kode: b.kode, status: baru, label: LABEL_STATUS_BOOKING[baru] } }
  }

  return { pembayaranBerhasil }
}
