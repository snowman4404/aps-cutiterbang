// /api/profil: Profil milik Member yang sedang login (US-5a). Hanya MemberFrequentTraveller (G12).
import { Hono } from 'hono'
import type { TanggalIso } from '@cutiterbang/domain'
import { buatGuard, type Variabel } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaProfil } from './antarmukaProfil.ts'
import { buatPengendaliProfil } from './pengendaliProfil.ts'

export function ruteProfil(db: Db, hariIni: () => TanggalIso) {
  const { butuhLogin, butuhPeran } = buatGuard(db)
  const pengendali = buatPengendaliProfil(antarmukaProfil(db), hariIni)

  const rute = new Hono<Variabel>()
  rute.use('*', butuhLogin, butuhPeran('MemberFrequentTraveller'))

  // Langkah 1: data terakhir disimpan, kolom wajib, status.
  rute.get('/', async (c) => c.json({ profil: await pengendali.muatProfil(c.get('akun')) }))

  // Langkah 3 sampai 7: 200 { pesan, profil }, atau 400 { galat } per kolom (4a).
  rute.put('/', async (c) => {
    const badan = await c.req.json().catch(() => null)
    const mentah = badan && typeof badan === 'object' && !Array.isArray(badan) ? badan : {}
    const hasil = await pengendali.simpan(c.get('akun'), mentah)
    if (hasil.hasil === 'galat') return c.json({ galat: hasil.galat }, 400)
    return c.json({ pesan: hasil.pesan, profil: hasil.profil })
  })

  return rute
}
