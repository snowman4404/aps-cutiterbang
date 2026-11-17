// Data seed Profil demo (Member dan Pengunjung). Murni data, tanpa I/O. Kolom kosong = NULL (US-5a AC5).
import { DATA_PROFIL_KOSONG, type DataProfil } from '@cutiterbang/domain'
import { PENUMPANG } from './dataPemesanan.ts'

/** Profil per email akun demo. Sari Dewi (member1) sama dengan data penumpang CTB003 dan CTB005. */
export const PROFIL_DEMO: Record<string, DataProfil> = {
  // lengkap: validasi CTB005 menghasilkan "valid"
  'member1@cutiterbang.test': { ...PENUMPANG['member1@cutiterbang.test']! },
  // tidak lengkap (nomor identitas kosong): validasi tiket ditolak "Data profil tidak lengkap" (3a)
  'member2@cutiterbang.test': { ...PENUMPANG['member2@cutiterbang.test']!, nomorIdentitas: null },
  'pengunjung1@cutiterbang.test': {
    namaLengkap: 'Maya Lestari',
    nomorIdentitas: '3171010404940004',
    tanggalLahir: '1994-04-04',
    nomorTelepon: '081234567004',
    email: 'pengunjung1@cutiterbang.test',
  },
  // tidak lengkap: dipakai Fase 6 (US-8b ekstensi 5a)
  'pengunjung2@cutiterbang.test': {
    ...DATA_PROFIL_KOSONG,
    namaLengkap: 'Rizky Hidayat',
    email: 'pengunjung2@cutiterbang.test',
  },
}
