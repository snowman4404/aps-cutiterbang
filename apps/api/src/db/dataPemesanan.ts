// Data seed Pemesanan demo agar "Tiket Saya" tidak kosong. Murni data, tanpa I/O, supaya tes dan e2e bisa memakainya.
// CTB005 dan CTB006 berstatus Confirmed: seed memberi masing-masing satu ETiket (inv ConfirmedPunyaETiket), untuk demo US-5b.
// CTB007 dipesan Manajer Travel untuk dua pengunjung (US-8b, US-8c); CTB008 (Booked) dan CTB009 (Confirmed, dengan e-tiket dan
// email ke profil pengunjung, US-8d) melengkapi setiap status untuk demo US-7; CTB010 dipesan Calon Penumpang, Confirmed lalu
// dibatalkan: e-tiketnya tetap ada tetapi void (G5).
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
  /** E-tiket tetap ada walau status bukan Confirmed (Confirmed lalu Cancelled, G5). Status Confirmed selalu punya e-tiket. */
  punyaETiket?: boolean
  /** Penumpang: akun yang `mewakili` (email akun demo) dan salinan DataWajib-nya. Pemesanan Calon Penumpang punya satu, atas dirinya sendiri. */
  penumpang: { akunEmail: string; data: DataWajib }[]
}

/** DataWajib akun demo; dipakai juga sebagai isian Profil (dataProfil.ts). */
export const PENUMPANG: Record<string, DataWajib> = {
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
  'pengunjung1@cutiterbang.test': {
    namaLengkap: 'Maya Lestari',
    nomorIdentitas: '3171010404940004',
    tanggalLahir: '1994-04-04',
    nomorTelepon: '081234567004',
    email: 'pengunjung1@cutiterbang.test',
  },
  'pengunjung3@cutiterbang.test': {
    namaLengkap: 'Citra Anggraini',
    nomorIdentitas: '3171010505960005',
    tanggalLahir: '1996-05-05',
    nomorTelepon: '081234567005',
    email: 'pengunjung3@cutiterbang.test',
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

  // Pemesan = penumpang tunggal (Calon Penumpang/Member), kecuali bila `penumpang` diberikan (Manajer Travel).
  const daftar: (Omit<DataPemesananSeed, 'penumpang'> & { pengunjung?: string[] })[] = [
    { kode: 'CTB001', status: 'WaitingForThePayment', akunEmail: 'penumpang@cutiterbang.test', ...pada('Yogyakarta', 'Denpasar', 7), waktuDibuat: jam(2) },
    { kode: 'CTB002', status: 'Cancelled', akunEmail: 'penumpang@cutiterbang.test', ...pada('Makassar', 'Balikpapan', 8), waktuDibuat: jam(30) },
    { kode: 'CTB003', status: 'Booked', akunEmail: 'member1@cutiterbang.test', ...pada('Surabaya', 'Makassar', 6), waktuDibuat: jam(5) },
    { kode: 'CTB004', status: 'Booked', akunEmail: 'member2@cutiterbang.test', ...pada(DEMO.habis.asal, DEMO.habis.tujuan, DEMO.habis.hariKe), nomorPenerbangan: DEMO.habis.nomorPenerbangan, waktuDibuat: jam(8) },
    // Confirmed: member1 memvalidasinya menjadi "valid" (data Sari Dewi); CTB006 milik Budi Santoso, jadi "tidak valid" bagi member1.
    { kode: 'CTB005', status: 'Confirmed', akunEmail: 'member1@cutiterbang.test', ...pada('Jakarta', 'Balikpapan', 9), waktuDibuat: jam(12) },
    { kode: 'CTB006', status: 'Confirmed', akunEmail: 'penumpang@cutiterbang.test', ...pada('Yogyakarta', 'Jakarta', 10), waktuDibuat: jam(14) },
    // Manajer Travel memesan untuk dua pengunjung dengan satu kode (US-8b); pengunjung2 sengaja tanpa pemesanan (US-8c "Belum ada tiket").
    {
      kode: 'CTB007',
      status: 'WaitingForThePayment',
      akunEmail: 'travel@cutiterbang.test',
      ...pada('Jakarta', 'Yogyakarta', 12),
      waktuDibuat: jam(1),
      pengunjung: ['pengunjung1@cutiterbang.test', 'pengunjung3@cutiterbang.test'],
    },
    // Dua pemesanan Manajer Travel lagi: Booked (tinggal menunggu maskapai, demo simulator) dan Confirmed (e-tiket sudah terkirim).
    { kode: 'CTB008', status: 'Booked', akunEmail: 'travel@cutiterbang.test', ...pada('Makassar', 'Denpasar', 11), waktuDibuat: jam(3), pengunjung: ['pengunjung1@cutiterbang.test'] },
    {
      kode: 'CTB009',
      status: 'Confirmed',
      akunEmail: 'travel@cutiterbang.test',
      ...pada('Denpasar', 'Surabaya', 13),
      waktuDibuat: jam(16),
      pengunjung: ['pengunjung1@cutiterbang.test', 'pengunjung3@cutiterbang.test'],
    },
    // G5: Confirmed lalu dibatalkan Calon Penumpang; e-tiketnya (ET-CTB010) tetap ada, tampil sebagai void.
    { kode: 'CTB010', status: 'Cancelled', akunEmail: 'penumpang@cutiterbang.test', ...pada('Balikpapan', 'Surabaya', 14), waktuDibuat: jam(40), punyaETiket: true },
  ]
  return daftar.map(({ pengunjung, ...pemesanan }) => ({
    ...pemesanan,
    penumpang: (pengunjung ?? [pemesanan.akunEmail]).map((akunEmail) => ({ akunEmail, data: PENUMPANG[akunEmail]! })),
  }))
}
