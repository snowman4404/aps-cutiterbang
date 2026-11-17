// /api/penerbangan: pencarian penerbangan dan informasi satu penerbangan, publik (tanpa login).
import { Hono } from 'hono'
import { PESAN_JUMLAH_SEGMEN, PESAN_PENERBANGAN_TIDAK_DITEMUKAN, type SegmenMentah, type TanggalIso } from '@cutiterbang/domain'
import { buatGuard } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { buatPengendaliPemesanan } from './pengendaliPemesanan.ts'
import { buatPengendaliPencarian } from './pengendaliPencarian.ts'

export function rutePenerbangan(db: Db, hariIni: () => TanggalIso, sekarang: () => Date) {
  const katalog = antarmukaKatalogPenerbangan(db)
  const pengendali = buatPengendaliPencarian(katalog, hariIni, sekarang)
  const pemesanan = buatPengendaliPemesanan(katalog, antarmukaPemesanan(db), hariIni, sekarang)
  const { butuhLogin, butuhPeran } = buatGuard(db)
  const rute = new Hono()

  rute.get('/kota', async (c) => c.json(await pengendali.muatDaftarKota()))

  rute.get('/cari', async (c) => {
    const hasil = await pengendali.cariPenerbangan({
      asal: c.req.query('asal'),
      tujuan: c.req.query('tujuan'),
      tanggal: c.req.query('tanggal'),
    })
    return 'galat' in hasil ? c.json(hasil, 400) : c.json(hasil)
  })

  // US-4 (G12: hanya Member): pencarian multi-destinasi. Body `{ segmen: [{ asal, tujuan, tanggal }] }` (2 sampai 5);
  // 400 `{ galat: [per segmen] }` (sejajar dengan segmen) atau `{ pesan }` bila jumlah segmen tidak sah; 200 `{ segmen: [{ jumlah, penerbangan }] }`.
  rute.post('/multi', butuhLogin, butuhPeran('MemberFrequentTraveller'), async (c) => {
    const body = (await c.req.json().catch(() => null)) as { segmen?: unknown } | null
    const segmen = Array.isArray(body?.segmen) ? (body.segmen as SegmenMentah[]) : []
    const hasil = await pengendali.cariMultiDestinasi(segmen.map((isian) => (typeof isian === 'object' && isian !== null ? isian : {})))
    if ('jumlahTidakSah' in hasil) return c.json({ pesan: PESAN_JUMLAH_SEGMEN }, 400)
    return 'galat' in hasil ? c.json(hasil, 400) : c.json(hasil)
  })

  // US-2a langkah 5: informasi satu penerbangan (ringkasan) termasuk sisaKursi dan tersedia.
  rute.get('/:id{[0-9]+}', async (c) => {
    const hasil = await pemesanan.siapkanRingkasan(Number(c.req.param('id')))
    return hasil ? c.json(hasil) : c.json({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN }, 404)
  })

  return rute
}
