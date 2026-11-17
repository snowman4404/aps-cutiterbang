// Boundary "Antarmuka Data Kepegawaian": membungkus kueri DB untuk Pegawai, PengajuanCuti, HariLibur.
// (Data Kepegawaian adalah sistem luar yang disimulasikan dengan data seed.)
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'
import type { PengajuanCuti, StatusPengajuanCuti, TanggalIso } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { hariLibur, pegawai, pengajuanCuti } from '../db/schema.ts'

export interface PegawaiRingkas {
  nama: string
  nomorIndukPegawai: string
}
export interface PegawaiDenganJatah extends PegawaiRingkas {
  jatahCutiTahunan: number
}
export interface PengajuanDenganPegawai extends PengajuanCuti, PegawaiRingkas {
  id: number
}

export function antarmukaDataKepegawaian(db: Db) {
  return {
    /** ambilDaftarPegawai: nama + NIP, urut nama. */
    async ambilDaftarPegawai(): Promise<PegawaiRingkas[]> {
      return db
        .select({ nama: pegawai.nama, nomorIndukPegawai: pegawai.nomorIndukPegawai })
        .from(pegawai)
        .orderBy(asc(pegawai.nama))
    },

    async cariPegawai(nip: string): Promise<(PegawaiDenganJatah & { id: number }) | null> {
      const baris = await db.select().from(pegawai).where(eq(pegawai.nomorIndukPegawai, nip)).get()
      return baris ?? null
    },

    async ambilHariLibur(): Promise<TanggalIso[]> {
      return (await db.select({ tanggal: hariLibur.tanggal }).from(hariLibur)).map((baris) => baris.tanggal)
    },

    /** ambilPengajuanBeririsan: Diajukan atau Disetujui yang beririsan dengan [mulai, akhir]. */
    async ambilPengajuanBeririsan(mulai: TanggalIso, akhir: TanggalIso): Promise<PengajuanDenganPegawai[]> {
      return db
        .select({
          id: pengajuanCuti.id,
          nama: pegawai.nama,
          nomorIndukPegawai: pegawai.nomorIndukPegawai,
          tanggalMulai: pengajuanCuti.tanggalMulai,
          tanggalAkhir: pengajuanCuti.tanggalAkhir,
          status: pengajuanCuti.status,
        })
        .from(pengajuanCuti)
        .innerJoin(pegawai, eq(pegawai.id, pengajuanCuti.pegawaiId))
        .where(
          and(
            inArray(pengajuanCuti.status, ['Diajukan', 'Disetujui'] satisfies StatusPengajuanCuti[]),
            lte(pengajuanCuti.tanggalMulai, akhir),
            gte(pengajuanCuti.tanggalAkhir, mulai),
          ),
        )
    },

    /** ambilCutiDisetujui(nip, tahun): Disetujui dengan tanggalMulai pada tahun itu. */
    async ambilCutiDisetujui(pegawaiId: number, tahun: number): Promise<PengajuanCuti[]> {
      return db
        .select({
          tanggalMulai: pengajuanCuti.tanggalMulai,
          tanggalAkhir: pengajuanCuti.tanggalAkhir,
          status: pengajuanCuti.status,
        })
        .from(pengajuanCuti)
        .where(
          and(
            eq(pengajuanCuti.pegawaiId, pegawaiId),
            eq(pengajuanCuti.status, 'Disetujui'),
            gte(pengajuanCuti.tanggalMulai, `${tahun}-01-01`),
            lte(pengajuanCuti.tanggalMulai, `${tahun}-12-31`),
          ),
        )
    },
  }
}

export type AntarmukaDataKepegawaian = ReturnType<typeof antarmukaDataKepegawaian>
