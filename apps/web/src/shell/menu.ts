// Sumber tunggal untuk menu: rute -> label, peran yang boleh membuka, use case.
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
  /** Use case terkait. */
  us: `US-${string}`
}

export const MENU: ItemMenu[] = [
  { path: '/cuti/pengajuan', grup: 'Manajemen cuti', label: 'Pengajuan Cuti', peran: ['HRDManajer'], us: 'US-1a' },
  { path: '/cuti/riwayat', grup: 'Manajemen cuti', label: 'Riwayat Cuti', peran: ['HRDManajer'], us: 'US-1b' },
  { path: '/cuti/sisa', grup: 'Manajemen cuti', label: 'Sisa Cuti', peran: ['HRDManajer'], us: 'US-1c' },
  { path: '/penerbangan', grup: 'Penerbangan', label: 'Cari Penerbangan', peran: 'publik', us: 'US-3' },
  { path: '/tiket-saya', grup: 'Perjalanan saya', label: 'Tiket Saya', peran: ['CalonPenumpang'], us: 'US-2a/2b' },
  { path: '/penerbangan/multi', grup: 'Penerbangan', label: 'Multi-destinasi', peran: ['MemberFrequentTraveller'], us: 'US-4' },
  { path: '/profil', grup: 'Akun', label: 'Profil', peran: ['MemberFrequentTraveller'], us: 'US-5a' },
  { path: '/validasi-tiket', grup: 'Perjalanan saya', label: 'Validasi Tiket', peran: ['MemberFrequentTraveller'], us: 'US-5b' },
  { path: '/travel/cari', grup: 'Pengunjung', label: 'Cari untuk Pengunjung', peran: ['ManajerTravel'], us: 'US-8a' },
  { path: '/travel/status', grup: 'Pengunjung', label: 'Status Booking', peran: ['ManajerTravel'], us: 'US-7' },
  { path: '/travel/cek-kode', grup: 'Pengunjung', label: 'Cek Kode Booking', peran: ['ManajerTravel'], us: 'US-9' },
  { path: '/tiket-dipesankan', grup: 'Perjalanan saya', label: 'Tiket Saya', peran: ['Pengunjung'], us: 'US-8c' },
]

/** Peran yang dibatasi untuk item ini, atau null bila item publik (satu-satunya tempat sentinel 'publik' dibaca). */
export function peranTerbatas(item: ItemMenu): Peran[] | null {
  return item.peran === 'publik' ? null : item.peran
}

/** Boleh dibuka? Publik: siapa saja; selain itu akun harus punya salah satu peran item (Member memenuhi CalonPenumpang). */
export function bolehBuka(item: ItemMenu, akun: { peran: Peran } | null): boolean {
  const terbatas = peranTerbatas(item)
  return terbatas === null || (akun !== null && punyaPeran(akun.peran, terbatas))
}

/** Item yang boleh dibuka oleh akun ini (null = belum masuk: hanya yang publik). */
export function menuUntuk(akun: { peran: Peran } | null): ItemMenu[] {
  return MENU.filter((item) => bolehBuka(item, akun))
}

export interface KelompokMenu {
  grup: Grup
  item: ItemMenu[]
}

/** Kelompokkan item menurut grup (urutan URUTAN_GRUP; urutan item dipertahankan). */
export function kelompokMenu(items: ItemMenu[]): KelompokMenu[] {
  return URUTAN_GRUP.map((grup) => ({ grup, item: items.filter((item) => item.grup === grup) })).filter(
    (kelompok) => kelompok.item.length > 0,
  )
}
