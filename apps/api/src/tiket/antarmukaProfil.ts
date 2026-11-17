// Boundary Profil: kueri DB untuk tabel `profil` (satu baris per akun Member atau Pengunjung). Tanpa aturan bisnis.
import { eq } from 'drizzle-orm'
import { DATA_PROFIL_KOSONG, type DataProfil } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { profil } from '../db/schema.ts'

export function antarmukaProfil(db: Db) {
  return {
    /** Data Profil akun; Profil yang barisnya belum ada dianggap kosong. */
    async ambil(akunId: number): Promise<DataProfil> {
      const baris = await db.select().from(profil).where(eq(profil.akunId, akunId)).get()
      if (!baris) return { ...DATA_PROFIL_KOSONG }
      return {
        namaLengkap: baris.namaLengkap,
        nomorIdentitas: baris.nomorIdentitas,
        tanggalLahir: baris.tanggalLahir,
        nomorTelepon: baris.nomorTelepon,
        email: baris.email,
      }
    },

    /** ubahData(data) (US-5a langkah 5): semua kolom diganti, kolom kosong menjadi NULL. Dibuat bila barisnya belum ada. */
    async ubahData(akunId: number, data: DataProfil): Promise<void> {
      await db
        .insert(profil)
        .values({ akunId, ...data })
        .onConflictDoUpdate({ target: profil.akunId, set: data })
    },
  }
}

export type AntarmukaProfil = ReturnType<typeof antarmukaProfil>
