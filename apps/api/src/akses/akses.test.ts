import { beforeEach, describe, expect, test } from 'vitest'
import { PESAN_TIDAK_ADA_AKSES } from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { seed, SANDI_DEMO } from '../db/seed.ts'
import { hashSandi, cocokSandi } from './sandi.ts'

let app: ReturnType<typeof buatApp>

beforeEach(async () => {
  const db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db)
  app = buatApp(db)
})

const kirim = (path: string, body?: unknown, cookie?: string, method = 'POST') =>
  app.request(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

const ambilCookie = (res: Response) => {
  const sc = res.headers.get('set-cookie') ?? ''
  const m = /sid=([^;]*)/.exec(sc)
  return m && m[1] ? `sid=${m[1]}` : ''
}

const masuk = async (email: string) => {
  const res = await kirim('/auth/masuk', { email, kataSandi: SANDI_DEMO })
  expect(res.status).toBe(200)
  return ambilCookie(res)
}

describe('sandi', () => {
  test('hash berbeda tiap pemanggilan, tetap cocok', async () => {
    const a = await hashSandi('rahasia123')
    const b = await hashSandi('rahasia123')
    expect(a).not.toBe(b)
    expect(await cocokSandi('rahasia123', a)).toBe(true)
    expect(await cocokSandi('salah', a)).toBe(false)
  })
})

describe('POST /api/auth/daftar', () => {
  const data = {
    nama: '  Citra  ',
    email: ' Citra@Contoh.COM ',
    kataSandi: 'sandi12345',
    peran: 'MemberFrequentTraveller',
  }

  test('berhasil: 201, akun tanpa hash, cookie sesi httpOnly', async () => {
    const res = await kirim('/auth/daftar', data)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.akun).toMatchObject({
      nama: 'Citra',
      email: 'citra@contoh.com',
      peran: 'MemberFrequentTraveller',
    })
    expect(Object.keys(body.akun).sort()).toEqual(['email', 'id', 'nama', 'peran'])
    const sc = res.headers.get('set-cookie') ?? ''
    expect(sc).toMatch(/HttpOnly/i)
    expect(sc).toMatch(/SameSite=Lax/i)
    expect(sc).toMatch(/Path=\//)

    const saya = await kirim('/auth/saya', undefined, ambilCookie(res), 'GET')
    expect(saya.status).toBe(200)
  })

  test('validasi gagal: 400 dengan galat per kolom', async () => {
    const res = await kirim('/auth/daftar', { nama: '', email: 'x', kataSandi: 'a', peran: 'HRDManajer' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(Object.keys(body.galat).sort()).toEqual(['email', 'kataSandi', 'nama', 'peran'])
  })

  test('email duplikat (tanpa membedakan huruf besar): 409', async () => {
    const res = await kirim('/auth/daftar', { ...data, email: 'HRD@cutiterbang.test' })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ pesan: 'Email sudah terdaftar' })
  })
})

describe('POST /api/auth/masuk', () => {
  test('berhasil: 200 dan cookie', async () => {
    const res = await kirim('/auth/masuk', { email: 'HRD@cutiterbang.test', kataSandi: SANDI_DEMO })
    expect(res.status).toBe(200)
    expect((await res.json()).akun).toMatchObject({ nama: 'Rina Wulandari', peran: 'HRDManajer' })
    expect(ambilCookie(res)).not.toBe('')
  })

  test('kata sandi salah: 401', async () => {
    const res = await kirim('/auth/masuk', { email: 'hrd@cutiterbang.test', kataSandi: 'salah' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ pesan: 'Email atau kata sandi salah' })
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  test('email tidak dikenal: 401 dengan pesan yang sama', async () => {
    const res = await kirim('/auth/masuk', { email: 'tidakada@x.test', kataSandi: SANDI_DEMO })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ pesan: 'Email atau kata sandi salah' })
  })
})

describe('GET /api/auth/saya dan POST /api/auth/keluar', () => {
  test('tanpa cookie: 401', async () => {
    const res = await kirim('/auth/saya', undefined, undefined, 'GET')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ pesan: 'Silakan masuk terlebih dahulu' })
  })

  test('cookie ngawur: 401', async () => {
    const res = await kirim('/auth/saya', undefined, 'sid=bukan-token', 'GET')
    expect(res.status).toBe(401)
  })

  test('dengan cookie: 200 dan akun', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const res = await kirim('/auth/saya', undefined, cookie, 'GET')
    expect(res.status).toBe(200)
    expect((await res.json()).akun).toMatchObject({ nama: 'Budi Santoso', peran: 'CalonPenumpang' })
  })

  test('keluar: 204, cookie dihapus, sesi tidak berlaku lagi', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const res = await kirim('/auth/keluar', undefined, cookie)
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toMatch(/sid=;|Max-Age=0/)
    const saya = await kirim('/auth/saya', undefined, cookie, 'GET')
    expect(saya.status).toBe(401)
  })
})

describe('guard peran', () => {
  test('tanpa login: 401', async () => {
    const res = await kirim('/cuti/pegawai', undefined, undefined, 'GET')
    expect(res.status).toBe(401)
  })

  test('peran salah: 403', async () => {
    const cookie = await masuk('penumpang@cutiterbang.test')
    const res = await kirim('/cuti/pegawai', undefined, cookie, 'GET')
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
  })

  test('HRDManajer lolos guard HRDManajer', async () => {
    const cookie = await masuk('hrd@cutiterbang.test')
    const res = await kirim('/cuti/pegawai', undefined, cookie, 'GET')
    expect(res.status).toBe(200)
  })

  test('Member lolos guard CalonPenumpang', async () => {
    const cookie = await masuk('member1@cutiterbang.test')
    const res = await kirim('/pemesanan/saya', undefined, cookie, 'GET')
    expect(res.status).toBe(200)
  })

  test('Pengunjung dan ManajerTravel ditolak guard CalonPenumpang', async () => {
    for (const email of ['pengunjung1@cutiterbang.test', 'travel@cutiterbang.test']) {
      const res = await kirim('/pemesanan/saya', undefined, await masuk(email), 'GET')
      expect(res.status).toBe(403)
    }
  })
})

describe('POST /api/dev/reset', () => {
  test('menghapus akun baru dan sesi, seed kembali', async () => {
    const res = await kirim('/auth/daftar', {
      nama: 'Baru',
      email: 'baru@contoh.com',
      kataSandi: 'sandi12345',
      peran: 'CalonPenumpang',
    })
    const cookie = ambilCookie(res)
    expect((await kirim('/dev/reset')).status).toBe(204)
    expect((await kirim('/auth/saya', undefined, cookie, 'GET')).status).toBe(401)
    expect((await kirim('/auth/masuk', { email: 'baru@contoh.com', kataSandi: 'sandi12345' })).status).toBe(401)
    expect((await kirim('/auth/masuk', { email: 'hrd@cutiterbang.test', kataSandi: SANDI_DEMO })).status).toBe(200)
  })
})
