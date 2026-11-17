// Peran (role) pada Akun. Satu akun = satu peran (G11).
export const DAFTAR_PERAN = [
  'HRDManajer',
  'CalonPenumpang',
  'MemberFrequentTraveller',
  'ManajerTravel',
  'Pengunjung',
] as const

export type Peran = (typeof DAFTAR_PERAN)[number]

export const LABEL_PERAN: Record<Peran, string> = {
  HRDManajer: 'HRD Manajer',
  CalonPenumpang: 'Calon Penumpang',
  MemberFrequentTraveller: 'Member Frequent Traveller',
  ManajerTravel: 'Manajer Travel',
  Pengunjung: 'Pengunjung',
}

export const PESAN_TIDAK_ADA_AKSES = 'Anda tidak memiliki akses ke halaman ini'

// Generalisasi: MemberFrequentTraveller juga memenuhi CalonPenumpang. Peran lain tidak mewarisi.
export function punyaPeran(peranAkun: Peran, diizinkan: readonly Peran[]): boolean {
  if (diizinkan.includes(peranAkun)) return true
  return peranAkun === 'MemberFrequentTraveller' && diizinkan.includes('CalonPenumpang')
}
