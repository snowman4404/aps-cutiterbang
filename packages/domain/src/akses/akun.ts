import type { Peran } from './peran.ts'

/** Akun seperti yang dilihat klien (tanpa hash kata sandi): bentuk tunggal untuk API dan web. */
export interface AkunPublik {
  id: number
  nama: string
  email: string
  peran: Peran
}
