// /api/pemesanan: memesan tiket (US-2a), Tiket Saya, dan membatalkan pemesanan (US-2b). Hanya CalonPenumpang (Member juga).
import { Hono } from 'hono'
import {
  PESAN_PEMESANAN_TIDAK_DITEMUKAN,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_TIDAK_ADA_AKSES,
  type TanggalIso,
} from '@cutiterbang/domain'
import { buatGuard, type Variabel } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { buatPengendaliPembatalan } from './pengendaliPembatalan.ts'
import { buatPengendaliPemesanan } from './pengendaliPemesanan.ts'

export function rutePemesanan(db: Db, hariIni: () => TanggalIso, sekarang: () => Date) {
  const { butuhLogin, butuhPeran } = buatGuard(db)
  const katalog = antarmukaKatalogPenerbangan(db)
  const data = antarmukaPemesanan(db)
  const pemesanan = buatPengendaliPemesanan(katalog, data, hariIni, sekarang)
  const pembatalan = buatPengendaliPembatalan(katalog, data, sekarang)

  const r = new Hono<Variabel>()
  r.use('*', butuhLogin, butuhPeran('CalonPenumpang'))

  // US-2a: konfirmasi pemesanan (kontrak C1).
  r.post('/', async (c) => {
    const badan = (await c.req.json().catch(() => null)) as { idPenerbangan?: unknown; dataPenumpang?: unknown } | null
    const id = Number(badan?.idPenerbangan)
    if (!Number.isInteger(id)) return c.json({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN }, 404)
    const mentah = badan?.dataPenumpang && typeof badan.dataPenumpang === 'object' ? badan.dataPenumpang : {}
    const hasil = await pemesanan.konfirmasi(c.get('akun'), id, mentah)
    switch (hasil.hasil) {
      case 'berhasil':
        return c.json({ pemesanan: hasil.pemesanan }, 201)
      case 'galat':
        return c.json({ galat: hasil.galat }, 400)
      case 'habis':
        return c.json({ pesan: hasil.pesan }, 409)
      case 'tidakDitemukan':
        return c.json({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN }, 404)
    }
  })

  // Tiket Saya (US-2b langkah 1 dan 2a).
  r.get('/saya', async (c) => c.json(await pembatalan.tentukanPemesananDapatDibatalkan(c.get('akun'))))

  // US-2b: pembatalan setelah pemesan mengonfirmasi di dialog (kontrak C3).
  r.post('/:kode/batalkan', async (c) => {
    const hasil = await pembatalan.batalkan(c.get('akun'), c.req.param('kode'))
    switch (hasil.hasil) {
      case 'berhasil':
        return c.json({ pemesanan: hasil.pemesanan })
      case 'tidakDitemukan':
        return c.json({ pesan: PESAN_PEMESANAN_TIDAK_DITEMUKAN }, 404)
      case 'bukanPemesan':
        return c.json({ pesan: PESAN_TIDAK_ADA_AKSES }, 403)
      case 'tidakBisa':
        return c.json({ pesan: hasil.pesan }, 409)
    }
  })

  return r
}
