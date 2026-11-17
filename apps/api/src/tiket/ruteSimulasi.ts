// /api/simulasi: sistem luar yang disimulasikan (di luar lingkup): Pembayaran (WaitingForThePayment -> Booked) dan
// Maskapai (Booked -> Confirmed, lalu e-tiket dan email, US-8d), plus GET / untuk panel simulator demo. Mewakili sistem lain, jadi tanpa penjaga peran;
// seperti POST /api/dev/reset, mati (404) di produksi kecuali IZINKAN_RESET=1.
import { Hono, type Context } from 'hono'
import { LABEL_PERAN, LABEL_STATUS_BOOKING, PESAN_SIMULATOR_TIDAK_AKTIF, sistemLuarUntuk, type RingkasanSimulator } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { antarmukaLayananEmail } from './antarmukaLayananEmail.ts'
import { antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { antarmukaPengunjung } from './antarmukaPengunjung.ts'
import { buatPengendaliETiket } from './pengendaliETiket.ts'
import { ubahStatusSistemLuar, type HasilUbahStatus } from './ubahStatusSistemLuar.ts'

export function ruteSimulasi(db: Db, sekarang: () => Date, aktif: () => boolean) {
  const data = antarmukaPemesanan(db)
  const email = antarmukaLayananEmail(db)
  const eTiket = buatPengendaliETiket(antarmukaKatalogPenerbangan(db), data, antarmukaPengunjung(db), email, sekarang)

  const rute = new Hono()
  rute.use('*', async (c, lanjut) => (aktif() ? lanjut() : c.json({ pesan: PESAN_SIMULATOR_TIDAK_AKTIF }, 404)))

  // 200 `{ pemesanan: { kode, status, label } }`; 404 `{ pesan }` kode tidak dikenal; 409 `{ pesan }` transisi tidak sah.
  const jawab = (c: Context, hasil: HasilUbahStatus) =>
    hasil.hasil === 'berhasil'
      ? c.json({ pemesanan: hasil.pemesanan })
      : c.json({ pesan: hasil.pesan }, hasil.hasil === 'tidakDitemukan' ? 404 : 409)

  // Panel simulator demo (Fase 7): semua pemesanan dengan sistem luar yang bisa memicunya, dan seluruh kotak keluar email.
  rute.get('/', async (c) => {
    const ringkasan: RingkasanSimulator = {
      pemesanan: (await data.semuaMenurutWaktuDibuat()).map((b) => ({
        kode: b.kode,
        pemesan: LABEL_PERAN[b.peranPemesan],
        penumpang: b.penumpang.map((p) => p.namaLengkap),
        status: b.status,
        label: LABEL_STATUS_BOOKING[b.status],
        sistem: sistemLuarUntuk(b.status),
      })),
      email: await email.semua(),
    }
    return c.json(ringkasan)
  })

  // Antarmuka Pembayaran: pembayaranBerhasil(kode) = ubahStatus(Booked), tanpa efek masuk.
  rute.post('/pembayaran/:kode', async (c) => jawab(c, await ubahStatusSistemLuar(data, 'pembayaran', c.req.param('kode'))))
  // Antarmuka Maskapai: konfirmasiKursi(kode)
  rute.post('/maskapai/:kode', async (c) => jawab(c, await eTiket.ubahStatusMenjadiConfirmed(c.req.param('kode'))))

  return rute
}
