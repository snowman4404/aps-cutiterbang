// /api/penerbangan: pencarian penerbangan dan informasi satu penerbangan, publik (tanpa login).
import { Hono } from 'hono'
import { PESAN_PENERBANGAN_TIDAK_DITEMUKAN, type TanggalIso } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { buatPengendaliPemesanan } from './pengendaliPemesanan.ts'
import { buatPengendaliPencarian } from './pengendaliPencarian.ts'

export function rutePenerbangan(db: Db, hariIni: () => TanggalIso, sekarang: () => Date) {
  const katalog = antarmukaKatalogPenerbangan(db)
  const pengendali = buatPengendaliPencarian(katalog, hariIni, sekarang)
  const pemesanan = buatPengendaliPemesanan(katalog, antarmukaPemesanan(db), hariIni, sekarang)
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

  // US-2a langkah 5: informasi satu penerbangan (ringkasan) termasuk sisaKursi dan tersedia.
  rute.get('/:id{[0-9]+}', async (c) => {
    const hasil = await pemesanan.siapkanRingkasan(Number(c.req.param('id')))
    return hasil ? c.json(hasil) : c.json({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN }, 404)
  })

  return rute
}
