import { validasiPendaftaran } from '@cutiterbang/domain'
import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Db } from '../db/client.ts'
import { akun, profil } from '../db/schema.ts'
import { buatGuard, type Variabel } from './middleware.ts'
import { cocokSandi, hashSandi } from './sandi.ts'
import { akhiriSesi, keAkunPublik, mulaiSesi } from './sesi.ts'

const PESAN_EMAIL_SUDAH_TERDAFTAR = 'Email sudah terdaftar'

const normalisasiEmail = (nilai: unknown) => (typeof nilai === 'string' ? nilai.trim().toLowerCase() : '')
// Isian badan permintaan yang bukan string dianggap kosong.
const keTeks = (nilai: unknown) => (typeof nilai === 'string' ? nilai : '')

// Hash palsu agar waktu respons mirip saat email tidak dikenal.
const HASH_PALSU = '00'.repeat(16) + ':' + '00'.repeat(64)

export function ruteAuth(db: Db) {
  const { butuhLogin } = buatGuard(db)
  const rute = new Hono<Variabel>()

  rute.post('/daftar', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const hasil = validasiPendaftaran({
      nama: keTeks(body.nama),
      email: keTeks(body.email),
      kataSandi: keTeks(body.kataSandi),
      peran: keTeks(body.peran),
    })
    if (!hasil.ok) return c.json({ galat: hasil.galat }, 400)
    const data = hasil.data

    const email = normalisasiEmail(data.email)
    const ada = await db.select({ id: akun.id }).from(akun).where(eq(akun.email, email)).get()
    if (ada) return c.json({ pesan: PESAN_EMAIL_SUDAH_TERDAFTAR }, 409)

    const kataSandiHash = await hashSandi(data.kataSandi)
    let akunBaru
    try {
      const sisipAkun = db
        .insert(akun)
        .values({
          nama: data.nama,
          email,
          kataSandiHash,
          peran: data.peran,
          dibuatPada: new Date(),
        })
        .returning()
      // Member punya Profil (komposisi, B1): dibuat kosong dalam batch yang sama dengan akunnya.
      const hasil =
        data.peran === 'MemberFrequentTraveller'
          ? await db.batch([sisipAkun, db.insert(profil).values({ akunId: sql`(select id from akun where email = ${email})` })])
          : await db.batch([sisipAkun])
      akunBaru = hasil[0][0]!
    } catch {
      // balapan pada email unik
      return c.json({ pesan: PESAN_EMAIL_SUDAH_TERDAFTAR }, 409)
    }
    await mulaiSesi(c, db, akunBaru.id)
    return c.json({ akun: keAkunPublik(akunBaru) }, 201)
  })

  rute.post('/masuk', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const email = normalisasiEmail(body.email)
    const akunDitemukan = await db.select().from(akun).where(eq(akun.email, email)).get()
    const sandiCocok = await cocokSandi(keTeks(body.kataSandi), akunDitemukan?.kataSandiHash ?? HASH_PALSU)
    if (!akunDitemukan || !sandiCocok) return c.json({ pesan: 'Email atau kata sandi salah' }, 401)
    await mulaiSesi(c, db, akunDitemukan.id)
    return c.json({ akun: keAkunPublik(akunDitemukan) })
  })

  rute.post('/keluar', async (c) => {
    await akhiriSesi(c, db)
    return c.body(null, 204)
  })

  rute.get('/saya', butuhLogin, (c) => c.json({ akun: keAkunPublik(c.get('akun')) }))

  return rute
}
