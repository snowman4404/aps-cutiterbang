import { PESAN_TIDAK_ADA_AKSES, punyaPeran, type Peran } from '@cutiterbang/domain'
import { createMiddleware } from 'hono/factory'
import type { Db } from '../db/client.ts'
import type { Akun } from '../db/schema.ts'
import { akunDariSesi } from './sesi.ts'

export const PESAN_BELUM_MASUK = 'Silakan masuk terlebih dahulu'

export type Variabel = { Variables: { akun: Akun } }

export function buatGuard(db: Db) {
  const butuhLogin = createMiddleware<Variabel>(async (c, next) => {
    const a = await akunDariSesi(c, db)
    if (!a) return c.json({ pesan: PESAN_BELUM_MASUK }, 401)
    c.set('akun', a)
    await next()
  })

  // Dipakai setelah butuhLogin.
  const butuhPeran = (...diizinkan: Peran[]) =>
    createMiddleware<Variabel>(async (c, next) => {
      const a = c.get('akun')
      if (!punyaPeran(a.peran, diizinkan)) return c.json({ pesan: PESAN_TIDAK_ADA_AKSES }, 403)
      await next()
    })

  return { butuhLogin, butuhPeran }
}
