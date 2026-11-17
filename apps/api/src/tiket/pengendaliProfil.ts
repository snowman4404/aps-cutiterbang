// Control PengendaliProfil (US-5a): muatProfil, validasiFormat, tandaiKolomSalah, ubahData, statusProfil, tampilkanPesan.
import {
  KOLOM_DATA_WAJIB,
  PESAN_PROFIL_TERSIMPAN,
  statusProfil,
  validasiProfil,
  type DataProfil,
  type DataWajibMentah,
  type GalatDataWajib,
  type ProfilDto,
  type TanggalIso,
} from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaProfil } from './antarmukaProfil.ts'

export type HasilSimpanProfil =
  /** Langkah 7: pesan "Data profil berhasil disimpan" dan status yang baru dihitung. */
  | { hasil: 'berhasil'; pesan: string; profil: ProfilDto }
  /** Ekstensi 4a: kolom terisi yang formatnya salah ditandai; tidak ada yang tersimpan. */
  | { hasil: 'galat'; galat: GalatDataWajib }

export function buatPengendaliProfil(data: AntarmukaProfil, hariIni: () => TanggalIso) {
  const keDto = (isi: DataProfil): ProfilDto => ({ data: isi, kolomWajib: KOLOM_DATA_WAJIB, status: statusProfil(isi, hariIni()) })

  /** muatProfil() (langkah 1): data terakhir disimpan, kolom wajib dan status profil. */
  async function muatProfil(akun: Pick<Akun, 'id'>): Promise<ProfilDto> {
    return keDto(await data.ambil(akun.id))
  }

  /** simpan(data) (langkah 4 sampai 7): validasiFormat, ubahData, lalu status profil dihitung ulang. */
  async function simpan(akun: Pick<Akun, 'id'>, mentah: DataWajibMentah): Promise<HasilSimpanProfil> {
    const hasil = validasiProfil(mentah, hariIni())
    if ('galat' in hasil) return { hasil: 'galat', galat: hasil.galat } // tandaiKolomSalah (4a)
    await data.ubahData(akun.id, hasil.data)
    return { hasil: 'berhasil', pesan: PESAN_PROFIL_TERSIMPAN, profil: keDto(hasil.data) }
  }

  return { muatProfil, simpan }
}
