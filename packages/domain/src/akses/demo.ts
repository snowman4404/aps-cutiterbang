import type { Peran } from './peran.ts'

// Data demo murni (tanpa I/O): dipakai seed API dan kotak "Akun demo" di halaman masuk.
export const SANDI_DEMO = 'rahasia123'

export interface AkunDemo {
  nama: string
  email: string
  peran: Peran
}

export const AKUN_DEMO: readonly AkunDemo[] = [
  { nama: 'Rina Wulandari', email: 'hrd@cutiterbang.test', peran: 'HRDManajer' },
  { nama: 'Budi Santoso', email: 'penumpang@cutiterbang.test', peran: 'CalonPenumpang' },
  { nama: 'Sari Dewi', email: 'member1@cutiterbang.test', peran: 'MemberFrequentTraveller' },
  { nama: 'Andi Pratama', email: 'member2@cutiterbang.test', peran: 'MemberFrequentTraveller' },
  { nama: 'Dimas Saputra', email: 'travel@cutiterbang.test', peran: 'ManajerTravel' },
  { nama: 'Maya Lestari', email: 'pengunjung1@cutiterbang.test', peran: 'Pengunjung' },
  { nama: 'Rizky Hidayat', email: 'pengunjung2@cutiterbang.test', peran: 'Pengunjung' },
]
