// Boundary "Antarmuka Data Kepegawaian": membungkus kueri DB untuk Pegawai, PengajuanCuti, HariLibur.
// (Data Kepegawaian adalah sistem luar yang disimulasikan dengan data seed.) Hanya mengambil baris mentah;
// aturan cuti (status, irisan periode, tahun berjalan, urutan) diterapkan oleh PengendaliCuti lewat domain.
import { asc, eq } from 'drizzle-orm'
import type { Pegawai, PegawaiRingkas, PengajuanCuti, TanggalIso } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { hariLibur, pegawai, pengajuanCuti } from '../db/schema.ts'

export interface PegawaiDenganId extends Pegawai {
  id: number
}
export interface PengajuanDenganId extends PengajuanCuti {
  id: number
}
export interface PengajuanDenganPegawai extends PengajuanDenganId, PegawaiRingkas {}

export function antarmukaDataKepegawaian(db: Db) {
  const kolomPengajuan = {
    id: pengajuanCuti.id,
    tanggalMulai: pengajuanCuti.tanggalMulai,
    tanggalAkhir: pengajuanCuti.tanggalAkhir,
    status: pengajuanCuti.status,
  }

  return {
    /** ambilDaftarPegawai: nama + NIP, urut nama. */
    async ambilDaftarPegawai(): Promise<PegawaiRingkas[]> {
      return db
        .select({ nama: pegawai.nama, nomorIndukPegawai: pegawai.nomorIndukPegawai })
        .from(pegawai)
        .orderBy(asc(pegawai.nama))
    },

    async cariPegawai(nip: string): Promise<PegawaiDenganId | null> {
      const baris = await db.select().from(pegawai).where(eq(pegawai.nomorIndukPegawai, nip)).get()
      return baris ?? null
    },

    async ambilHariLibur(): Promise<TanggalIso[]> {
      return (await db.select({ tanggal: hariLibur.tanggal }).from(hariLibur)).map((baris) => baris.tanggal)
    },

    /** Semua pengajuan semua status beserta nama pegawai (bahan ambilPengajuanBeririsan di PengendaliCuti). */
    async ambilSemuaPengajuan(): Promise<PengajuanDenganPegawai[]> {
      return db
        .select({ ...kolomPengajuan, nama: pegawai.nama, nomorIndukPegawai: pegawai.nomorIndukPegawai })
        .from(pengajuanCuti)
        .innerJoin(pegawai, eq(pegawai.id, pengajuanCuti.pegawaiId))
    },

    /** Semua pengajuan satu pegawai, semua status dan tahun (bahan ambilJatahDanCutiDisetujui di PengendaliCuti). */
    async ambilPengajuanPegawai(pegawaiId: number): Promise<PengajuanDenganId[]> {
      return db.select(kolomPengajuan).from(pengajuanCuti).where(eq(pengajuanCuti.pegawaiId, pegawaiId))
    },
  }
}

export type AntarmukaDataKepegawaian = ReturnType<typeof antarmukaDataKepegawaian>
