// Boundary Pengunjung (entitas Akun berperan Pengunjung) beserta Profil-nya: kueri DB tanpa aturan bisnis.
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { DataProfil } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { akun, profil } from '../db/schema.ts'

export interface PengunjungBaris {
  id: number
  nama: string
  /** `dataProfil()`: kolom Profil; Profil yang barisnya belum ada dianggap kosong. */
  data: DataProfil
}

export function antarmukaPengunjung(db: Db) {
  const pilih = () =>
    db
      .select({
        id: akun.id,
        nama: akun.nama,
        namaLengkap: profil.namaLengkap,
        nomorIdentitas: profil.nomorIdentitas,
        tanggalLahir: profil.tanggalLahir,
        nomorTelepon: profil.nomorTelepon,
        email: profil.email,
      })
      .from(akun)
      .leftJoin(profil, eq(profil.akunId, akun.id))

  // Join kiri: Profil yang barisnya belum ada memberi kolom null, sama dengan Profil kosong.
  const keBaris = (baris: Awaited<ReturnType<typeof pilih>>): PengunjungBaris[] =>
    baris.map((b) => ({
      id: b.id,
      nama: b.nama,
      data: {
        namaLengkap: b.namaLengkap,
        nomorIdentitas: b.nomorIdentitas,
        tanggalLahir: b.tanggalLahir,
        nomorTelepon: b.nomorTelepon,
        email: b.email,
      },
    }))

  return {
    /** Semua pengunjung terdaftar, urut nama (langkah 2). */
    async semua(): Promise<PengunjungBaris[]> {
      return keBaris(await pilih().where(eq(akun.peran, 'Pengunjung')).orderBy(asc(akun.nama), asc(akun.id)))
    },

    /** Pengunjung menurut id; id yang bukan akun Pengunjung tidak ikut. Urutan mengikuti `ids`. */
    async denganId(ids: number[]): Promise<PengunjungBaris[]> {
      if (ids.length === 0) return []
      const baris = keBaris(await pilih().where(and(eq(akun.peran, 'Pengunjung'), inArray(akun.id, ids))))
      return ids.flatMap((id) => baris.filter((b) => b.id === id))
    },
  }
}

export type AntarmukaPengunjung = ReturnType<typeof antarmukaPengunjung>
