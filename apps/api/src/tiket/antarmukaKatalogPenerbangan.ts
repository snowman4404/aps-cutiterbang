// Boundary katalog penerbangan: membungkus kueri DB untuk Kota, Maskapai, Penerbangan.
// (Katalog penerbangan adalah data seed; tidak ada sistem luar yang dipanggil.)
import { and, asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { sisaKursi, type HasilPencarian, type Kota, type Penerbangan } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { kota, maskapai, penerbangan } from '../db/schema.ts'

export interface PenerbanganLengkap extends Penerbangan {
  id: number
  maskapai: string
}

/** Proyeksi penerbangan yang cocok menjadi baris hasil pencarian (menambahkan /sisaKursi). */
export const keHasilPencarian = (f: PenerbanganLengkap, penumpangAktif: number): HasilPencarian => ({
  id: f.id,
  maskapai: f.maskapai,
  nomorPenerbangan: f.nomorPenerbangan,
  asal: f.asal,
  tujuan: f.tujuan,
  tanggalKeberangkatan: f.tanggalKeberangkatan,
  waktuBerangkat: f.waktuBerangkat,
  waktuTiba: f.waktuTiba,
  harga: f.harga,
  sisaKursi: sisaKursi(f.jumlahKursi, penumpangAktif),
})

export function antarmukaKatalogPenerbangan(db: Db) {
  return {
    /** ambilDaftarKota: semua kota yang dilayani, urut nama. */
    async ambilDaftarKota(): Promise<Kota[]> {
      return db.select().from(kota).orderBy(asc(kota.nama))
    },

    /** ambilPenerbanganRute: semua penerbangan asal -> tujuan pada tanggal itu (belum disaring ketersediaannya). */
    async ambilPenerbanganRute(asalId: number, tujuanId: number, tanggal: string): Promise<PenerbanganLengkap[]> {
      const asal = alias(kota, 'asal')
      const tujuan = alias(kota, 'tujuan')
      const baris = await db
        .select({
          id: penerbangan.id,
          nomorPenerbangan: penerbangan.nomorPenerbangan,
          tanggalKeberangkatan: penerbangan.tanggalKeberangkatan,
          waktuBerangkat: penerbangan.waktuBerangkat,
          waktuTiba: penerbangan.waktuTiba,
          harga: penerbangan.harga,
          jumlahKursi: penerbangan.jumlahKursi,
          maskapai: maskapai.nama,
          asal: { id: asal.id, nama: asal.nama, zonaWaktu: asal.zonaWaktu },
          tujuan: { id: tujuan.id, nama: tujuan.nama, zonaWaktu: tujuan.zonaWaktu },
        })
        .from(penerbangan)
        .innerJoin(maskapai, eq(maskapai.id, penerbangan.maskapaiId))
        .innerJoin(asal, eq(asal.id, penerbangan.asalId))
        .innerJoin(tujuan, eq(tujuan.id, penerbangan.tujuanId))
        .where(
          and(
            eq(penerbangan.asalId, asalId),
            eq(penerbangan.tujuanId, tujuanId),
            eq(penerbangan.tanggalKeberangkatan, tanggal),
          ),
        )
        .orderBy(asc(penerbangan.id))
      return baris
    },

    /**
     * Jumlah penumpang pada Pemesanan yang tidak berstatus Cancelled, per id penerbangan (satu kueri agregat).
     * Pemesanan belum ada (Fase 4), jadi semuanya 0; Fase 4 menggantinya dengan hitungan nyata.
     */
    async jumlahPenumpangAktif(idPenerbangan: number[]): Promise<Map<number, number>> {
      return new Map(idPenerbangan.map((id) => [id, 0]))
    },
  }
}

export type AntarmukaKatalogPenerbangan = ReturnType<typeof antarmukaKatalogPenerbangan>
