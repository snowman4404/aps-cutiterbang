// Sumber tunggal untuk menu: rute -> label, peran yang boleh membuka, fase roadmap.
// Nav, kartu Beranda, dan guard rute semuanya membaca daftar ini.
import { punyaPeran, type Peran } from '@cutiterbang/domain'

export interface ItemMenu {
  path: string
  label: string
  /** 'publik' = tanpa login; selain itu daftar peran yang boleh (Member juga memenuhi CalonPenumpang). */
  peran: 'publik' | Peran[]
  /** Fase roadmap yang membangun halaman ini. */
  fase: number
  /** Use case terkait. */
  us: string
}

export const MENU: ItemMenu[] = [
  { path: '/cuti/pengajuan', label: 'Pengajuan Cuti', peran: ['HRDManajer'], fase: 2, us: 'US-1a' },
  { path: '/cuti/riwayat', label: 'Riwayat Cuti', peran: ['HRDManajer'], fase: 2, us: 'US-1b' },
  { path: '/cuti/sisa', label: 'Sisa Cuti', peran: ['HRDManajer'], fase: 2, us: 'US-1c' },
  { path: '/penerbangan', label: 'Cari Penerbangan', peran: 'publik', fase: 3, us: 'US-3' },
  { path: '/tiket-saya', label: 'Tiket Saya', peran: ['CalonPenumpang'], fase: 4, us: 'US-2a/2b' },
  { path: '/penerbangan/multi', label: 'Multi-destinasi', peran: ['MemberFrequentTraveller'], fase: 5, us: 'US-4' },
  { path: '/profil', label: 'Profil', peran: ['MemberFrequentTraveller'], fase: 5, us: 'US-5a' },
  { path: '/validasi-tiket', label: 'Validasi Tiket', peran: ['MemberFrequentTraveller'], fase: 5, us: 'US-5b' },
  { path: '/travel/cari', label: 'Cari untuk Pengunjung', peran: ['ManajerTravel'], fase: 6, us: 'US-8a' },
  { path: '/travel/status', label: 'Status Booking', peran: ['ManajerTravel'], fase: 6, us: 'US-7' },
  { path: '/travel/cek-kode', label: 'Cek Kode Booking', peran: ['ManajerTravel'], fase: 6, us: 'US-9' },
  { path: '/tiket-dipesankan', label: 'Tiket Saya', peran: ['Pengunjung'], fase: 6, us: 'US-8c' },
]

/** Item yang boleh dibuka oleh peran ini (null = belum masuk: hanya yang publik). */
export function menuUntuk(peran: Peran | null): ItemMenu[] {
  return MENU.filter((m) =>
    m.peran === 'publik' ? true : peran !== null && punyaPeran(peran, m.peran),
  )
}
