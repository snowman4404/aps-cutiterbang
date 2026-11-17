// /api/penerbangan: pencarian penerbangan, publik (tanpa login).
import { Hono } from 'hono'
import type { TanggalIso } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { buatPengendaliPencarian } from './pengendaliPencarian.ts'

export function rutePenerbangan(db: Db, hariIni: () => TanggalIso, sekarang: () => Date) {
  const pengendali = buatPengendaliPencarian(antarmukaKatalogPenerbangan(db), hariIni, sekarang)
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

  return rute
}
