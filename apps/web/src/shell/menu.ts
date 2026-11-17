// Sumber tunggal untuk menu: rute -> label, peran yang boleh membuka, fase roadmap.
// Nav, kartu Beranda, dan guard rute semuanya membaca daftar ini.
import { punyaPeran, type Peran } from '@cutiterbang/domain'

/** Urutan grup di sidebar dan Beranda. */
export const URUTAN_GRUP = ['Manajemen cuti', 'Penerbangan', 'Perjalanan saya', 'Akun', 'Pengunjung'] as const
export type Grup = (typeof URUTAN_GRUP)[number]

export interface ItemMenu {
  path: string
  /** Grup di sidebar. */
  grup: Grup
  label: string
  /** 'publik' = tanpa login; selain itu daftar peran yang boleh (Member juga memenuhi CalonPenumpang). */
  peran: 'publik' | Peran[]
  /** Fase roadmap yang membangun halaman ini. */
  fase: number
  /** Use case terkait. */
  us: string
}

export const MENU: ItemMenu[] = [
  { path: '/cuti/pengajuan', grup: 'Manajemen cuti', label: 'Pengajuan Cuti', peran: ['HRDManajer'], fase: 2, us: 'US-1a' },
  { path: '/cuti/riwayat', grup: 'Manajemen cuti', label: 'Riwayat Cuti', peran: ['HRDManajer'], fase: 2, us: 'US-1b' },
  { path: '/cuti/sisa', grup: 'Manajemen cuti', label: 'Sisa Cuti', peran: ['HRDManajer'], fase: 2, us: 'US-1c' },
  { path: '/penerbangan', grup: 'Penerbangan', label: 'Cari Penerbangan', peran: 'publik', fase: 3, us: 'US-3' },
  { path: '/tiket-saya', grup: 'Perjalanan saya', label: 'Tiket Saya', peran: ['CalonPenumpang'], fase: 4, us: 'US-2a/2b' },
  { path: '/penerbangan/multi', grup: 'Penerbangan', label: 'Multi-destinasi', peran: ['MemberFrequentTraveller'], fase: 5, us: 'US-4' },
  { path: '/profil', grup: 'Akun', label: 'Profil', peran: ['MemberFrequentTraveller'], fase: 5, us: 'US-5a' },
  { path: '/validasi-tiket', grup: 'Perjalanan saya', label: 'Validasi Tiket', peran: ['MemberFrequentTraveller'], fase: 5, us: 'US-5b' },
  { path: '/travel/cari', grup: 'Pengunjung', label: 'Cari untuk Pengunjung', peran: ['ManajerTravel'], fase: 6, us: 'US-8a' },
  { path: '/travel/status', grup: 'Pengunjung', label: 'Status Booking', peran: ['ManajerTravel'], fase: 6, us: 'US-7' },
  { path: '/travel/cek-kode', grup: 'Pengunjung', label: 'Cek Kode Booking', peran: ['ManajerTravel'], fase: 6, us: 'US-9' },
  { path: '/tiket-dipesankan', grup: 'Perjalanan saya', label: 'Tiket Saya', peran: ['Pengunjung'], fase: 6, us: 'US-8c' },
]

/** Item yang boleh dibuka oleh peran ini (null = belum masuk: hanya yang publik). */
export function menuUntuk(peran: Peran | null): ItemMenu[] {
  return MENU.filter((m) =>
    m.peran === 'publik' ? true : peran !== null && punyaPeran(peran, m.peran),
  )
}

export interface KelompokMenu {
  grup: Grup
  item: ItemMenu[]
}

/** Kelompokkan item menurut grup (urutan URUTAN_GRUP; urutan item dipertahankan). */
export function kelompokMenu(items: ItemMenu[]): KelompokMenu[] {
  return URUTAN_GRUP.map((grup) => ({ grup, item: items.filter((m) => m.grup === grup) })).filter(
    (k) => k.item.length > 0,
  )
}
