// Data seed Profil demo (Member dan Pengunjung). Murni data, tanpa I/O. Kolom kosong = NULL (US-5a AC5).
import { DATA_PROFIL_KOSONG, type DataProfil } from '@cutiterbang/domain'
import { PENUMPANG } from './dataPemesanan.ts'

/** Profil per email akun demo. Sari Dewi (member1) sama dengan data penumpang CTB003 dan CTB005. */
export const PROFIL_DEMO: Record<string, DataProfil> = {
  // lengkap: validasi CTB005 menghasilkan "valid"
  'member1@cutiterbang.test': { ...PENUMPANG['member1@cutiterbang.test']! },
  // tidak lengkap (nomor identitas kosong): validasi tiket ditolak "Data profil tidak lengkap" (3a)
  'member2@cutiterbang.test': { ...PENUMPANG['member2@cutiterbang.test']!, nomorIdentitas: null },
  // lengkap: penumpang CTB007 (US-8b, US-8c)
  'pengunjung1@cutiterbang.test': { ...PENUMPANG['pengunjung1@cutiterbang.test']! },
  // lengkap: pasangan pengunjung1 pada CTB007 dan pada pemesanan dua penumpang
  'pengunjung3@cutiterbang.test': { ...PENUMPANG['pengunjung3@cutiterbang.test']! },
  // tidak lengkap: dipakai US-8b ekstensi 5a
  'pengunjung2@cutiterbang.test': {
    ...DATA_PROFIL_KOSONG,
    namaLengkap: 'Rizky Hidayat',
    email: 'pengunjung2@cutiterbang.test',
  },
}
