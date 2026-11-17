// /api/penerbangan: pencarian penerbangan, publik (tanpa login).
import { Hono } from 'hono'
import type { TanggalIso } from '@cutiterbang/domain'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { buatPengendaliPencarian } from './pengendaliPencarian.ts'

export function rutePenerbangan(db: Db, hariIni: () => TanggalIso, sekarang: () => Date) {
  const pengendali = buatPengendaliPencarian(antarmukaKatalogPenerbangan(db), hariIni, sekarang)
  const r = new Hono()

  r.get('/kota', async (c) => c.json(await pengendali.muatDaftarKota()))

  r.get('/cari', async (c) => {
    const hasil = await pengendali.cariPenerbangan(c.req.query('asal'), c.req.query('tujuan'), c.req.query('tanggal'))
    return 'galat' in hasil ? c.json(hasil, 400) : c.json(hasil)
  })

  return r
}
