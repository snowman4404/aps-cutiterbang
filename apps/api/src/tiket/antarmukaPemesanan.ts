// Boundary Pemesanan: kueri DB untuk Pemesanan, Penumpang dan AlokasiKursi (entitas desain agregat Penerbangan).
// Aturan bisnis ada di domain dan control; di sini hanya akses data dan operasi atomik.
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import {
  normalKode,
  STATUS_AWAL_BOOKING,
  STATUS_DAPAT_DIBATALKAN,
  STATUS_DIBATALKAN,
  type DataWajib,
  type StatusBooking,
} from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { alokasiKursi, pemesanan, penumpang } from '../db/schema.ts'

export interface PenumpangBaris extends DataWajib {
  /** Peran `mewakili`: selalu terisi (C1 dan C2 selalu mencatatnya). */
  akunId: number
}

export interface PemesananBaris {
  id: number
  kode: string
  status: StatusBooking
  waktuDibuat: Date
  penerbanganId: number
  pemesanId: number
  penumpang: PenumpangBaris[]
}

export interface PemesananBaru {
  kode: string
  penerbanganId: number
  pemesanId: number
  waktuDibuat: Date
  /** Satu Penumpang yang mewakili `pemesanId`; datanya salinan DataWajib. */
  data: DataWajib
}

/** Hasil `alokasiKursi`: pemesanan dibuat bersama alokasinya, atau ditolak karena kursi tidak cukup. */
export type HasilAlokasi = 'diterima' | 'ditolak'

/** Pelanggaran UNIQUE pada kode_normal (inv KodeUnik, G3): dilaporkan oleh SQLite pada alokasi_kursi atau pemesanan. */
export function adalahKodeBentrok(galat: unknown): boolean {
  const teks = (sebab: unknown): string =>
    sebab instanceof Error ? `${sebab.message} ${teks((sebab as { cause?: unknown }).cause)}` : ''
  const pesan = teks(galat)
  return /UNIQUE constraint failed/i.test(pesan) && /kode_normal/.test(pesan)
}

export function antarmukaPemesanan(db: Db) {
  async function lengkapi(baris: (typeof pemesanan.$inferSelect)[]): Promise<PemesananBaris[]> {
    if (baris.length === 0) return []
    const daftarPenumpang = await db
      .select()
      .from(penumpang)
      .where(inArray(penumpang.pemesananId, baris.map((pesanan) => pesanan.id)))
      .orderBy(penumpang.id)
    return baris.map((pesanan) => ({
      id: pesanan.id,
      kode: pesanan.kode,
      status: pesanan.status,
      waktuDibuat: pesanan.waktuDibuat,
      penerbanganId: pesanan.penerbanganId,
      pemesanId: pesanan.pemesanId,
      penumpang: daftarPenumpang
        .filter((orang) => orang.pemesananId === pesanan.id)
        .map((orang) => ({
          akunId: orang.akunId,
          namaLengkap: orang.namaLengkap,
          nomorIdentitas: orang.nomorIdentitas,
          tanggalLahir: orang.tanggalLahir,
          nomorTelepon: orang.nomorTelepon,
          email: orang.email,
        })),
    }))
  }

  return {
    /**
     * alokasiKursi(kode, jumlah) pada Penerbangan, bersama pembuatan Pemesanan(WaitingForThePayment) dan Penumpang
     * (sequence US-2a langkah 7b, 8, 9). Satu `db.batch` (satu transaksi): alokasi hanya masuk bila
     * jumlah > 0 dan jumlahKursi - kursi terpakai >= jumlah, diperiksa dan ditulis dalam satu pernyataan SQL;
     * itu implementasi atomik dari `bolehAlokasi` (domain), yang tidak bisa dipakai langsung karena hitungan
     * kursi terpakai bisa usang antara membaca dan menulis. Pemesanan serta
     * Penumpang hanya dibuat bila alokasinya masuk. Karena itu pemesanan serentak tidak bisa membuat overbooking.
     * Melempar galat UNIQUE (lihat `adalahKodeBentrok`) bila kode sudah dipakai; batch dibatalkan seluruhnya.
     */
    async alokasiKursi(b: PemesananBaru, jumlah: number): Promise<HasilAlokasi> {
      const kodeNormal = normalKode(b.kode)
      const waktuDibuatMs = b.waktuDibuat.getTime()
      const hasil = await db.batch([
        db.run(sql`
          INSERT INTO alokasi_kursi (penerbangan_id, kode_normal, jumlah)
          SELECT p.id, ${kodeNormal}, ${jumlah} FROM penerbangan p
          WHERE p.id = ${b.penerbanganId}
            AND ${jumlah} > 0
            AND p.jumlah_kursi - COALESCE((SELECT SUM(a.jumlah) FROM alokasi_kursi a WHERE a.penerbangan_id = p.id), 0) >= ${jumlah}`),
        db.run(sql`
          INSERT INTO pemesanan (kode, kode_normal, status, waktu_dibuat, penerbangan_id, pemesan_id)
          SELECT ${b.kode}, ${kodeNormal}, ${STATUS_AWAL_BOOKING}, ${waktuDibuatMs}, ${b.penerbanganId}, ${b.pemesanId}
          WHERE EXISTS (SELECT 1 FROM alokasi_kursi WHERE kode_normal = ${kodeNormal})`),
        db.run(sql`
          INSERT INTO penumpang (pemesanan_id, akun_id, nama_lengkap, nomor_identitas, tanggal_lahir, nomor_telepon, email)
          SELECT m.id, ${b.pemesanId}, ${b.data.namaLengkap}, ${b.data.nomorIdentitas}, ${b.data.tanggalLahir}, ${b.data.nomorTelepon}, ${b.data.email}
          FROM pemesanan m
          WHERE m.kode_normal = ${kodeNormal}
            AND EXISTS (SELECT 1 FROM alokasi_kursi WHERE kode_normal = ${kodeNormal})
            AND NOT EXISTS (SELECT 1 FROM penumpang x WHERE x.pemesanan_id = m.id)`),
      ])
      return hasil[0].rowsAffected === 1 ? 'diterima' : 'ditolak'
    },

    /**
     * batalkan (kontrak C3, langkah 5-6): status menjadi Cancelled dan alokasi kursinya dilepas
     * (kejadian domain PemesananDibatalkan), dalam satu batch. false bila pemesanan sudah Cancelled atau tidak ada.
     */
    async batalkan(kode: string): Promise<boolean> {
      const kodeNormal = normalKode(kode)
      const hasil = await db.batch([
        // Hanya status yang boleh menerima `batalkan` menurut mesin status (domain) yang berubah.
        db
          .update(pemesanan)
          .set({ status: STATUS_DIBATALKAN })
          .where(and(eq(pemesanan.kodeNormal, kodeNormal), inArray(pemesanan.status, [...STATUS_DAPAT_DIBATALKAN]))),
        db
          .delete(alokasiKursi)
          .where(
            sql`${alokasiKursi.kodeNormal} = ${kodeNormal} AND EXISTS (SELECT 1 FROM pemesanan WHERE kode_normal = ${kodeNormal} AND status = ${STATUS_DIBATALKAN})`,
          ),
      ])
      return hasil[0].rowsAffected > 0
    },

    /** cariDenganKode: kode dicocokkan lewat normal() (tanpa membedakan kapital dan spasi tepi). */
    async cariDenganKode(kode: string): Promise<PemesananBaris | null> {
      const baris = await db.select().from(pemesanan).where(eq(pemesanan.kodeNormal, normalKode(kode))).limit(1)
      return (await lengkapi(baris))[0] ?? null
    },

    /** tiketSaya(akun): pemesan = akun, atau ada Penumpang yang `mewakili` akun; terbaru dulu. */
    async tiketSaya(akunId: number): Promise<PemesananBaris[]> {
      const baris = await db
        .select()
        .from(pemesanan)
        .where(
          or(
            eq(pemesanan.pemesanId, akunId),
            inArray(pemesanan.id, db.select({ id: penumpang.pemesananId }).from(penumpang).where(eq(penumpang.akunId, akunId))),
          ),
        )
        .orderBy(desc(pemesanan.waktuDibuat), desc(pemesanan.id))
      return lengkapi(baris)
    },
  }
}

export type AntarmukaPemesanan = ReturnType<typeof antarmukaPemesanan>
