// Boundary Layanan Email (sistem luar, disimulasikan): kotak keluar `email_terkirim`. Mengirim = menyimpan baris; tidak ada
// pengiriman nyata. Pengiriman ikut dalam batch perubahan status (lihat PengendaliETiket), jadi tidak pernah ada email
// untuk pemesanan yang tidak jadi Confirmed.
import { desc, eq, sql } from 'drizzle-orm'
import { normalKode, type EmailETiket, type EmailETiketDto, type EmailKotakKeluar } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { emailTerkirim, pemesanan } from '../db/schema.ts'
import type { PernyataanBatch } from './antarmukaPemesanan.ts'

export function antarmukaLayananEmail(db: Db) {
  return {
    /**
     * kirimETiket(e, email) sebagai pernyataan batch: satu baris kotak keluar per pemesanan dan alamat, hanya bila pemesanan
     * itu sudah punya e-tiket bernomor `nomorETiket` (jadi hanya untuk pemesanan Confirmed) dan alamat itu belum dikirimi.
     * `waktuKirim` dicatat saat itu juga (batas 5 menit, Asumsi 12).
     */
    kirimETiket(kode: string, nomorETiket: string, e: EmailETiket, waktuKirim: Date): PernyataanBatch {
      return db.run(sql`
        INSERT INTO email_terkirim (pemesanan_id, akun_id, kepada, subjek, isi, waktu_kirim)
        SELECT m.id, ${e.akunId}, ${e.kepada}, ${e.subjek}, ${e.isi}, ${waktuKirim.getTime()} FROM pemesanan m
        WHERE m.kode_normal = ${normalKode(kode)}
          AND EXISTS (SELECT 1 FROM etiket t WHERE t.pemesanan_id = m.id AND t.nomor_e_tiket = ${nomorETiket})
          AND NOT EXISTS (SELECT 1 FROM email_terkirim x WHERE x.pemesanan_id = m.id AND x.kepada = ${e.kepada})`)
    },

    /** Email yang dikirim kepada akun itu, dikelompokkan menurut kode booking reference (terbaru dulu). */
    async terkirimKepada(akunId: number): Promise<Map<string, EmailETiketDto[]>> {
      const baris = await db
        .select({
          kode: pemesanan.kode,
          kepada: emailTerkirim.kepada,
          subjek: emailTerkirim.subjek,
          isi: emailTerkirim.isi,
          waktuKirim: emailTerkirim.waktuKirim,
        })
        .from(emailTerkirim)
        .innerJoin(pemesanan, eq(pemesanan.id, emailTerkirim.pemesananId))
        .where(eq(emailTerkirim.akunId, akunId))
        .orderBy(desc(emailTerkirim.waktuKirim), desc(emailTerkirim.id))
      const hasil = new Map<string, EmailETiketDto[]>()
      for (const b of baris)
        hasil.set(b.kode, [...(hasil.get(b.kode) ?? []), { kepada: b.kepada, subjek: b.subjek, isi: b.isi, waktuKirim: b.waktuKirim.toISOString() }])
      return hasil
    },

    /** Seluruh kotak keluar, terbaru dulu (panel simulator demo). */
    async semua(): Promise<EmailKotakKeluar[]> {
      const baris = await db
        .select({
          kode: pemesanan.kode,
          kepada: emailTerkirim.kepada,
          subjek: emailTerkirim.subjek,
          isi: emailTerkirim.isi,
          waktuKirim: emailTerkirim.waktuKirim,
        })
        .from(emailTerkirim)
        .innerJoin(pemesanan, eq(pemesanan.id, emailTerkirim.pemesananId))
        .orderBy(desc(emailTerkirim.waktuKirim), desc(emailTerkirim.id))
      return baris.map((b) => ({ ...b, waktuKirim: b.waktuKirim.toISOString() }))
    },
  }
}

export type AntarmukaLayananEmail = ReturnType<typeof antarmukaLayananEmail>
