// Data seed Pemesanan demo agar "Tiket Saya" tidak kosong. Murni data, tanpa I/O, supaya tes dan e2e bisa memakainya.
// Tidak ada pemesanan Confirmed: ConfirmedPunyaETiket butuh ETiket, yang baru ada di Fase 6.
import { tambahHari, type DataWajib, type StatusBooking, type TanggalIso } from '@cutiterbang/domain'
import { buatDataPenerbangan, DEMO } from './dataPenerbangan.ts'

export interface DataPemesananSeed {
  kode: string
  status: StatusBooking
  /** Email akun pemesan (akun demo). */
  akunEmail: string
  nomorPenerbangan: string
  tanggalKeberangkatan: TanggalIso
  /** Instan pembuatan (ms sejak epoch). */
  waktuDibuat: number
  /** DataWajib penumpang tunggal (mewakili akun pemesan). */
  penumpang: DataWajib
}

const PENUMPANG: Record<string, DataWajib> = {
  'penumpang@cutiterbang.test': {
    namaLengkap: 'Budi Santoso',
    nomorIdentitas: '3171010101900001',
    tanggalLahir: '1990-01-01',
    nomorTelepon: '081234567001',
    email: 'penumpang@cutiterbang.test',
  },
  'member1@cutiterbang.test': {
    namaLengkap: 'Sari Dewi',
    nomorIdentitas: '3171010202920002',
    tanggalLahir: '1992-02-02',
    nomorTelepon: '081234567002',
    email: 'member1@cutiterbang.test',
  },
  'member2@cutiterbang.test': {
    namaLengkap: 'Andi Pratama',
    nomorIdentitas: '3171010303880003',
    tanggalLahir: '1988-03-03',
    nomorTelepon: '081234567003',
    email: 'member2@cutiterbang.test',
  },
}

/** Pemesanan demo; kode tetap supaya seed idempoten (`onConflictDoNothing` pada kode normal). */
export function buatDataPemesanan(hariIni: TanggalIso): DataPemesananSeed[] {
  const { penerbangan } = buatDataPenerbangan(hariIni)
  // Penerbangan pertama pada rute dan hari itu (urutan seed), dipilih dari rute yang bukan rute pencarian demo.
  const pada = (asal: string, tujuan: string, hariKe: number) => {
    const ditemukan = penerbangan.find(
      (kandidat) => kandidat.asal === asal && kandidat.tujuan === tujuan && kandidat.tanggalKeberangkatan === tambahHari(hariIni, hariKe),
    )
    if (!ditemukan) throw new Error(`Penerbangan demo tidak ada: ${asal} -> ${tujuan} hari ke-${hariKe}`)
    return { nomorPenerbangan: ditemukan.nomorPenerbangan, tanggalKeberangkatan: ditemukan.tanggalKeberangkatan }
  }
  const awalHari = Date.parse(`${hariIni}T00:00:00Z`)
  const jam = (jumlah: number) => awalHari - jumlah * 3_600_000 // `jumlah` jam sebelum 00:00 UTC hari ini

  const daftar: Omit<DataPemesananSeed, 'penumpang'>[] = [
    { kode: 'CTB001', status: 'WaitingForThePayment', akunEmail: 'penumpang@cutiterbang.test', ...pada('Yogyakarta', 'Denpasar', 7), waktuDibuat: jam(2) },
    { kode: 'CTB002', status: 'Cancelled', akunEmail: 'penumpang@cutiterbang.test', ...pada('Makassar', 'Balikpapan', 8), waktuDibuat: jam(30) },
    { kode: 'CTB003', status: 'Booked', akunEmail: 'member1@cutiterbang.test', ...pada('Surabaya', 'Makassar', 6), waktuDibuat: jam(5) },
    { kode: 'CTB004', status: 'Booked', akunEmail: 'member2@cutiterbang.test', ...pada(DEMO.habis.asal, DEMO.habis.tujuan, DEMO.habis.hariKe), nomorPenerbangan: DEMO.habis.nomorPenerbangan, waktuDibuat: jam(8) },
  ]
  return daftar.map((pemesanan) => ({ ...pemesanan, penumpang: PENUMPANG[pemesanan.akunEmail]! }))
}
