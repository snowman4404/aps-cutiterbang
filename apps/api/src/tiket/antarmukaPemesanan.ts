// Boundary Pemesanan: kueri DB untuk Pemesanan, Penumpang dan AlokasiKursi (entitas desain agregat Penerbangan).
// Aturan bisnis ada di domain dan control; di sini hanya akses data dan operasi atomik.
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import {
  normalKode,
  STATUS_AWAL_BOOKING,
  STATUS_DAPAT_DIBATALKAN,
  STATUS_DIBATALKAN,
  type DataWajib,
  type Peran,
  type StatusBooking,
} from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { akun, alokasiKursi, etiket, pemesanan, penumpang, perjalananTercatat } from '../db/schema.ts'

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
  /** Peran akun pemesan (menentukan `penerimaETiket()`, G6). */
  peranPemesan: Peran
  penumpang: PenumpangBaris[]
  /** ETiket (satu per pemesanan): ada hanya setelah Confirmed, tetap ada setelah Cancelled (G5). */
  eTiket: { nomor: string; waktuTerbit: Date } | null
}

export interface PemesananBaru {
  kode: string
  penerbanganId: number
  pemesanId: number
  waktuDibuat: Date
  /** Penumpang (satu atau lebih) beserta akun yang `mewakili` dan salinan DataWajib-nya; jumlah kursi = panjang daftar. */
  penumpang: PenumpangBaris[]
}

/** Satu pernyataan SQL yang ikut dalam `db.batch` (efek masuk status). */
export type PernyataanBatch = ReturnType<Db['run']>

/** Hasil `alokasiKursi`: pemesanan dibuat bersama alokasinya, atau ditolak karena kursi tidak cukup. */
export type HasilAlokasi = 'diterima' | 'ditolak'

/** Pelanggaran UNIQUE pada kode_normal (inv KodeUnik, G3): dilaporkan oleh SQLite pada alokasi_kursi atau pemesanan. */
export function adalahKodeBentrok(galat: unknown): boolean {
  const teks = (sebab: unknown): string =>
    sebab instanceof Error ? `${sebab.message} ${teks((sebab as { cause?: unknown }).cause)}` : ''
  const pesan = teks(galat)
  return /UNIQUE constraint failed/i.test(pesan) && /kode_normal/.test(pesan)
}

const tiketDari = (e: typeof etiket.$inferSelect | undefined) => (e ? { nomor: e.nomorETiket, waktuTerbit: e.waktuTerbit } : null)

export function antarmukaPemesanan(db: Db) {
  async function lengkapi(baris: (typeof pemesanan.$inferSelect)[]): Promise<PemesananBaris[]> {
    if (baris.length === 0) return []
    const ids = baris.map((pesanan) => pesanan.id)
    const [daftarPenumpang, daftarETiket, daftarPemesan] = await Promise.all([
      db.select().from(penumpang).where(inArray(penumpang.pemesananId, ids)).orderBy(penumpang.id),
      db.select().from(etiket).where(inArray(etiket.pemesananId, ids)),
      db.select({ id: akun.id, peran: akun.peran }).from(akun).where(inArray(akun.id, [...new Set(baris.map((pesanan) => pesanan.pemesanId))])),
    ])
    return baris.map((pesanan) => ({
      id: pesanan.id,
      kode: pesanan.kode,
      status: pesanan.status,
      waktuDibuat: pesanan.waktuDibuat,
      penerbanganId: pesanan.penerbanganId,
      pemesanId: pesanan.pemesanId,
      peranPemesan: daftarPemesan.find((a) => a.id === pesanan.pemesanId)!.peran,
      eTiket: tiketDari(daftarETiket.find((e) => e.pemesananId === pesanan.id)),
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
     * (sequence US-2a langkah 7b, 8, 9; US-8b langkah 5b, 6, 7 dengan satu Penumpang per pengunjung). Satu `db.batch` (satu transaksi): alokasi hanya masuk bila
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
        // Satu pernyataan per Penumpang, masing-masing hanya bila alokasinya masuk dan akun itu belum tercantum pada pemesanan ini.
        ...b.penumpang.map((orang) =>
          db.run(sql`
            INSERT INTO penumpang (pemesanan_id, akun_id, nama_lengkap, nomor_identitas, tanggal_lahir, nomor_telepon, email)
            SELECT m.id, ${orang.akunId}, ${orang.namaLengkap}, ${orang.nomorIdentitas}, ${orang.tanggalLahir}, ${orang.nomorTelepon}, ${orang.email}
            FROM pemesanan m
            WHERE m.kode_normal = ${kodeNormal}
              AND EXISTS (SELECT 1 FROM alokasi_kursi WHERE kode_normal = ${kodeNormal})
              AND NOT EXISTS (SELECT 1 FROM penumpang x WHERE x.pemesanan_id = m.id AND x.akun_id = ${orang.akunId})`),
        ),
      ])
      return hasil[0].rowsAffected === 1 ? 'diterima' : 'ditolak'
    },

    /**
     * batalkan (kontrak C3, langkah 5-6): status menjadi Cancelled dan alokasi kursinya dilepas
     * (kejadian domain PemesananDibatalkan), dalam satu batch; G8: perjalanan yang tercatat untuk pemesanan ini
     * (perjalananTercatat semua member) ikut dihapus. ETiket tidak disentuh (G5). false bila pemesanan sudah Cancelled atau tidak ada.
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
        db
          .delete(perjalananTercatat)
          .where(
            inArray(
              perjalananTercatat.pemesananId,
              db.select({ id: pemesanan.id }).from(pemesanan).where(and(eq(pemesanan.kodeNormal, kodeNormal), eq(pemesanan.status, STATUS_DIBATALKAN))),
            ),
          ),
      ])
      return hasil[0].rowsAffected > 0
    },

    /**
     * ubahStatus(kode, dari, ke) (US-8d langkah 1, simulator): status berubah hanya bila masih `dari` (penjaga atomik di SQL,
     * jadi dua pemicu serentak tidak keduanya berhasil), bersama `efekMasuk` (pernyataan SQL yang menjaga dirinya sendiri,
     * mis. `terbitkanETiket`) dalam satu batch. false bila status sudah bukan `dari` atau kode tidak ada.
     */
    async ubahStatus(kode: string, dari: StatusBooking, ke: StatusBooking, efekMasuk: PernyataanBatch[] = []): Promise<boolean> {
      const hasil = await db.batch([
        db.update(pemesanan).set({ status: ke }).where(and(eq(pemesanan.kodeNormal, normalKode(kode)), eq(pemesanan.status, dari))),
        ...efekMasuk,
      ])
      return hasil[0].rowsAffected === 1
    },

    /**
     * terbitkanETiket(nomor) sebagai pernyataan batch: satu ETiket untuk pemesanan itu, hanya bila pemesanan Confirmed dan
     * belum punya e-tiket (inv ConfirmedPunyaETiket; ETiketHanyaSetelahConfirmed).
     */
    terbitkanETiket(kode: string, nomor: string, waktuTerbit: Date): PernyataanBatch {
      return db.run(sql`
        INSERT INTO etiket (pemesanan_id, nomor_e_tiket, waktu_terbit)
        SELECT m.id, ${nomor}, ${waktuTerbit.getTime()} FROM pemesanan m
        WHERE m.kode_normal = ${normalKode(kode)} AND m.status = 'Confirmed'
          AND NOT EXISTS (SELECT 1 FROM etiket e WHERE e.pemesanan_id = m.id)`)
    },

    /** semuaMenurutWaktuDibuat (US-7 langkah 1): semua pemesanan, yang paling baru dibuat dulu. */
    async semuaMenurutWaktuDibuat(): Promise<PemesananBaris[]> {
      return lengkapi(await db.select().from(pemesanan).orderBy(desc(pemesanan.waktuDibuat), desc(pemesanan.id)))
    },

    /** denganStatus (US-7 langkah 3): pemesanan berstatus itu, yang paling baru dibuat dulu. */
    async denganStatus(status: StatusBooking): Promise<PemesananBaris[]> {
      return lengkapi(await db.select().from(pemesanan).where(eq(pemesanan.status, status)).orderBy(desc(pemesanan.waktuDibuat), desc(pemesanan.id)))
    },

    /** Pemesanan menurut id (urutan mengikuti `ids`); dipakai perjalananTercatat. */
    async denganId(ids: number[]): Promise<PemesananBaris[]> {
      if (ids.length === 0) return []
      const lengkap = await lengkapi(await db.select().from(pemesanan).where(inArray(pemesanan.id, ids)))
      return ids.flatMap((id) => lengkap.filter((b) => b.id === id))
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

    /** yangMencantumkan(akun) (US-8c langkah 2): hanya pemesanan dengan Penumpang yang `mewakili` akun itu; terbaru dulu. */
    async yangMencantumkan(akunId: number): Promise<PemesananBaris[]> {
      const baris = await db
        .select()
        .from(pemesanan)
        .where(inArray(pemesanan.id, db.select({ id: penumpang.pemesananId }).from(penumpang).where(eq(penumpang.akunId, akunId))))
        .orderBy(desc(pemesanan.waktuDibuat), desc(pemesanan.id))
      return lengkapi(baris)
    },
  }
}

export type AntarmukaPemesanan = ReturnType<typeof antarmukaPemesanan>
