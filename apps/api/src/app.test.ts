import { describe, expect, test } from 'vitest'
import { buatApp, resetDiizinkan, type LingkunganReset } from './app.ts'
import { buatDb } from './db/client.ts'
import { jalankanMigrasi } from './db/migrate.ts'
import { seed } from './db/seed.ts'

async function appDengan(lingkungan: LingkunganReset) {
  const db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db)
  return buatApp(db, { lingkungan })
}

describe('gerbang POST /api/dev/reset', () => {
  test('resetDiizinkan: aktif di luar produksi, di produksi hanya dengan IZINKAN_RESET=1', () => {
    expect(resetDiizinkan({ NODE_ENV: 'development' })).toBe(true)
    expect(resetDiizinkan({})).toBe(true)
    expect(resetDiizinkan({ NODE_ENV: 'production' })).toBe(false)
    expect(resetDiizinkan({ NODE_ENV: 'production', IZINKAN_RESET: '0' })).toBe(false)
    expect(resetDiizinkan({ NODE_ENV: 'production', IZINKAN_RESET: '1' })).toBe(true)
  })

  test('produksi: 404 dan /health melaporkan resetAktif false', async () => {
    const app = await appDengan({ NODE_ENV: 'production' })
    expect((await app.request('/api/dev/reset', { method: 'POST' })).status).toBe(404)
    expect(await (await app.request('/api/health')).json()).toMatchObject({ ok: true, resetAktif: false })
  })

  test('produksi dengan IZINKAN_RESET=1: 204 dan resetAktif true', async () => {
    const app = await appDengan({ NODE_ENV: 'production', IZINKAN_RESET: '1' })
    expect((await app.request('/api/dev/reset', { method: 'POST' })).status).toBe(204)
    expect(await (await app.request('/api/health')).json()).toMatchObject({ resetAktif: true })
  })

  test('development: 204 dan resetAktif true', async () => {
    const app = await appDengan({ NODE_ENV: 'development' })
    expect((await app.request('/api/dev/reset', { method: 'POST' })).status).toBe(204)
    expect(await (await app.request('/api/health')).json()).toMatchObject({ resetAktif: true })
  })
})
