// /api/validasi-tiket: Member mencatat perjalanannya (US-5b, kontrak C4). Hanya MemberFrequentTraveller (G12).
import { Hono } from 'hono'
import type { TanggalIso } from '@cutiterbang/domain'
import { buatGuard, type Variabel } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { antarmukaPerjalananTercatat } from './antarmukaPerjalananTercatat.ts'
import { antarmukaProfil } from './antarmukaProfil.ts'
import { buatPengendaliValidasiTiket } from './pengendaliValidasiTiket.ts'

export function ruteValidasiTiket(db: Db, hariIni: () => TanggalIso, sekarang: () => Date) {
  const { butuhLogin, butuhPeran } = buatGuard(db)
  const pengendali = buatPengendaliValidasiTiket(
    antarmukaKatalogPenerbangan(db),
    antarmukaPemesanan(db),
    antarmukaProfil(db),
    antarmukaPerjalananTercatat(db),
    hariIni,
    sekarang,
  )

  const rute = new Hono<Variabel>()
  rute.use('*', butuhLogin, butuhPeran('MemberFrequentTraveller'))

  // perjalananTercatat milik member (G8: hanya pemesanan yang belum dibatalkan).
  rute.get('/perjalanan', async (c) => c.json({ perjalanan: await pengendali.muatPerjalananTercatat(c.get('akun')) }))

  // Langkah 1 sampai 8. 400 { galat: { kode } } (2a); 409 { pesan } (3a, 5a); 404 { pesan } (4a);
  // 200 { hasil: 'valid' | 'tidakValid', ... } (6a, 7, 8a).
  rute.post('/', async (c) => {
    const badan = (await c.req.json().catch(() => null)) as { kode?: unknown } | null
    const hasil = await pengendali.validasiTiket(c.get('akun'), badan?.kode)
    switch (hasil.hasil) {
      case 'galat':
        return c.json({ galat: hasil.galat }, 400)
      case 'ditolak':
        return c.json({ pesan: hasil.pesan }, hasil.sebab === 'tidakDitemukan' ? 404 : 409)
      case 'selesai':
        return c.json(hasil.validasi)
    }
  })

  return rute
}
