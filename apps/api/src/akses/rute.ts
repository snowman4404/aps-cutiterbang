import { validasiPendaftaran, type Peran } from '@cutiterbang/domain'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Db } from '../db/client.ts'
import { akun } from '../db/schema.ts'
import { buatGuard, type Variabel } from './middleware.ts'
import { cocokSandi, hashSandi } from './sandi.ts'
import { akhiriSesi, keAkunPublik, mulaiSesi } from './sesi.ts'

const normalisasiEmail = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '')
const teks = (v: unknown) => (typeof v === 'string' ? v : '')

// Hash palsu agar waktu respons mirip saat email tidak dikenal.
const HASH_PALSU = '00'.repeat(16) + ':' + '00'.repeat(64)

export function ruteAuth(db: Db) {
  const { butuhLogin } = buatGuard(db)
  const r = new Hono<Variabel>()

  r.post('/daftar', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const data = {
      nama: teks(body.nama),
      email: teks(body.email),
      kataSandi: teks(body.kataSandi),
      peran: teks(body.peran),
    }
    const galat = validasiPendaftaran(data)
    if (Object.keys(galat).length > 0) return c.json({ galat }, 400)

    const email = normalisasiEmail(data.email)
    const ada = await db.select({ id: akun.id }).from(akun).where(eq(akun.email, email)).get()
    if (ada) return c.json({ pesan: 'Email sudah terdaftar' }, 409)

    const kataSandiHash = await hashSandi(data.kataSandi)
    let baru
    try {
      baru = await db
        .insert(akun)
        .values({
          nama: data.nama.trim(),
          email,
          kataSandiHash,
          peran: data.peran as Peran,
          dibuatPada: new Date(),
        })
        .returning()
        .get()
    } catch {
      // balapan pada email unik
      return c.json({ pesan: 'Email sudah terdaftar' }, 409)
    }
    await mulaiSesi(c, db, baru.id)
    return c.json({ akun: keAkunPublik(baru) }, 201)
  })

  r.post('/masuk', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const email = normalisasiEmail(body.email)
    const a = await db.select().from(akun).where(eq(akun.email, email)).get()
    const cocok = await cocokSandi(teks(body.kataSandi), a?.kataSandiHash ?? HASH_PALSU)
    if (!a || !cocok) return c.json({ pesan: 'Email atau kata sandi salah' }, 401)
    await mulaiSesi(c, db, a.id)
    return c.json({ akun: keAkunPublik(a) })
  })

  r.post('/keluar', async (c) => {
    await akhiriSesi(c, db)
    return c.body(null, 204)
  })

  r.get('/saya', butuhLogin, (c) => c.json({ akun: keAkunPublik(c.get('akun')) }))

  return r
}
