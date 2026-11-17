// Boundary katalog penerbangan: membungkus kueri DB untuk Kota, Maskapai, Penerbangan, dan hitungan kursi terpakai.
// (Katalog penerbangan adalah data seed; tidak ada sistem luar yang dipanggil.)
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { sisaKursi, type HasilPencarian, type Kota, type Penerbangan } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { alokasiKursi, kota, maskapai, penerbangan } from '../db/schema.ts'

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
  const asal = alias(kota, 'asal')
  const tujuan = alias(kota, 'tujuan')
  /** Penerbangan beserta maskapai dan kota asal/tujuan; tinggal diberi `where`. */
  const pilihPenerbangan = () =>
    db
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

  return {
    /** ambilDaftarKota: semua kota yang dilayani, urut nama. */
    async ambilDaftarKota(): Promise<Kota[]> {
      return db.select().from(kota).orderBy(asc(kota.nama))
    },

    /** ambilPenerbanganRute: semua penerbangan asal -> tujuan pada tanggal itu (belum disaring ketersediaannya). */
    async ambilPenerbanganRute(asalId: number, tujuanId: number, tanggal: string): Promise<PenerbanganLengkap[]> {
      return pilihPenerbangan()
        .where(
          and(
            eq(penerbangan.asalId, asalId),
            eq(penerbangan.tujuanId, tujuanId),
            eq(penerbangan.tanggalKeberangkatan, tanggal),
          ),
        )
        .orderBy(asc(penerbangan.id))
    },

    /** ambilPenerbangan: penerbangan menurut id (informasiPenerbangan), atau null bila tidak ada. */
    async ambilPenerbangan(id: number): Promise<PenerbanganLengkap | null> {
      return (await pilihPenerbangan().where(eq(penerbangan.id, id)).limit(1))[0] ?? null
    },

    /** ambilPenerbanganUntuk: beberapa penerbangan sekaligus, dipetakan menurut id (Tiket Saya). */
    async ambilPenerbanganUntuk(ids: number[]): Promise<Map<number, PenerbanganLengkap>> {
      if (ids.length === 0) return new Map()
      const baris = await pilihPenerbangan().where(inArray(penerbangan.id, ids))
      return new Map(baris.map((f) => [f.id, f]))
    },

    /**
     * Jumlah penumpang pada Pemesanan yang tidak berstatus Cancelled, per id penerbangan (satu kueri agregat):
     * jumlah baris `alokasi_kursi` per penerbangan. Alokasi dilepas saat pemesanan dibatalkan, jadi Cancelled tidak terhitung.
     */
    async jumlahPenumpangAktif(idPenerbangan: number[]): Promise<Map<number, number>> {
      const hasil = new Map(idPenerbangan.map((id) => [id, 0]))
      if (idPenerbangan.length === 0) return hasil
      const baris = await db
        .select({ id: alokasiKursi.penerbanganId, jumlah: sql<number>`sum(${alokasiKursi.jumlah})` })
        .from(alokasiKursi)
        .where(inArray(alokasiKursi.penerbanganId, idPenerbangan))
        .groupBy(alokasiKursi.penerbanganId)
      for (const b of baris) hasil.set(b.id, Number(b.jumlah))
      return hasil
    },
  }
}

export type AntarmukaKatalogPenerbangan = ReturnType<typeof antarmukaKatalogPenerbangan>
