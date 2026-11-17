// Boundary MemberFrequentTraveller.perjalananTercatat (himpunan): tabel `perjalanan_tercatat` dengan UNIQUE (akun, pemesanan).
import { and, desc, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client.ts'
import { perjalananTercatat } from '../db/schema.ts'

/** baru: tercatat sekarang; sudah: sudah ada (8a); tidakBisa: Pemesanan tidak (lagi) Confirmed, jadi tidak dicatat. */
export type HasilCatat = 'baru' | 'sudah' | 'tidakBisa'

export function antarmukaPerjalananTercatat(db: Db) {
  return {
    /**
     * catatPerjalanan(b) (langkah 7, 8, 8a): satu pernyataan SQL yang mencatat hanya bila Pemesanan masih berstatus
     * `statusSyarat` (Confirmed) dan memakai INSERT OR IGNORE pada UNIQUE (akun, pemesanan), jadi dua validasi serentak
     * tetap mencatat satu baris dan pembatalan serentak tidak meninggalkan perjalanan Cancelled (G8).
     */
    async catatPerjalanan(akunId: number, pemesananId: number, statusSyarat: string): Promise<HasilCatat> {
      const hasil = await db.run(sql`
        INSERT OR IGNORE INTO perjalanan_tercatat (akun_id, pemesanan_id)
        SELECT ${akunId}, m.id FROM pemesanan m WHERE m.id = ${pemesananId} AND m.status = ${statusSyarat}`)
      if (hasil.rowsAffected > 0) return 'baru'
      const ada = await db
        .select({ id: perjalananTercatat.id })
        .from(perjalananTercatat)
        .where(and(eq(perjalananTercatat.akunId, akunId), eq(perjalananTercatat.pemesananId, pemesananId)))
        .get()
      return ada ? 'sudah' : 'tidakBisa'
    },

    /** Id Pemesanan pada perjalananTercatat akun; yang terbaru dicatat dulu. */
    async idPemesanan(akunId: number): Promise<number[]> {
      const baris = await db
        .select({ pemesananId: perjalananTercatat.pemesananId })
        .from(perjalananTercatat)
        .where(eq(perjalananTercatat.akunId, akunId))
        .orderBy(desc(perjalananTercatat.id))
      return baris.map((b) => b.pemesananId)
    },
  }
}

export type AntarmukaPerjalananTercatat = ReturnType<typeof antarmukaPerjalananTercatat>
