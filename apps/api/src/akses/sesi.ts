import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Db } from '../db/client.ts'
import { akun, sesi, type Akun } from '../db/schema.ts'

export const NAMA_COOKIE = 'sid'
const UMUR_SESI_MS = 7 * 24 * 60 * 60 * 1000

export type AkunPublik = Pick<Akun, 'id' | 'nama' | 'email' | 'peran'>

export function keAkunPublik(a: Akun): AkunPublik {
  return { id: a.id, nama: a.nama, email: a.email, peran: a.peran }
}

export async function mulaiSesi(c: Context, db: Db, akunId: number) {
  const id = randomBytes(32).toString('hex')
  const kedaluwarsa = new Date(Date.now() + UMUR_SESI_MS)
  await db.insert(sesi).values({ id, akunId, kedaluwarsa })
  setCookie(c, NAMA_COOKIE, id, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    expires: kedaluwarsa,
  })
}

export async function akhiriSesi(c: Context, db: Db) {
  const id = getCookie(c, NAMA_COOKIE)
  if (id) await db.delete(sesi).where(eq(sesi.id, id))
  deleteCookie(c, NAMA_COOKIE, { path: '/' })
}

// Akun untuk sesi pada cookie, atau null bila tidak ada / kedaluwarsa.
export async function akunDariSesi(c: Context, db: Db): Promise<Akun | null> {
  const id = getCookie(c, NAMA_COOKIE)
  if (!id) return null
  const baris = await db
    .select({ akun, kedaluwarsa: sesi.kedaluwarsa })
    .from(sesi)
    .innerJoin(akun, eq(sesi.akunId, akun.id))
    .where(eq(sesi.id, id))
    .get()
  if (!baris) return null
  if (baris.kedaluwarsa.getTime() <= Date.now()) {
    await db.delete(sesi).where(eq(sesi.id, id))
    return null
  }
  return baris.akun
}
