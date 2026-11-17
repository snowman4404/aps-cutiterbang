// /api/tiket-dipesankan: "Tiket Saya" milik Pengunjung (US-8c) beserta email e-tiketnya (US-8d).
import { Hono } from 'hono'
import { buatGuard, type Variabel } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { antarmukaLayananEmail } from './antarmukaLayananEmail.ts'
import { antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { buatPengendaliTiketDipesankan } from './pengendaliTiketDipesankan.ts'

export function ruteTiketDipesankan(db: Db, sekarang: () => Date) {
  const { butuhLogin, butuhPeran } = buatGuard(db)
  const pengendali = buatPengendaliTiketDipesankan(antarmukaKatalogPenerbangan(db), antarmukaPemesanan(db), antarmukaLayananEmail(db), sekarang)

  const rute = new Hono<Variabel>()
  rute.use('*', butuhLogin, butuhPeran('Pengunjung'))
  rute.get('/', async (c) => c.json(await pengendali.tiketSaya(c.get('akun'))))
  return rute
}
