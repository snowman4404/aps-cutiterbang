// Produksi satu layanan: /api ke API, berkas build web disajikan, rute SPA jatuh ke index.html.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { buatApp } from './app.ts'
import { buatDb } from './db/client.ts'
import { jalankanMigrasi } from './db/migrate.ts'
import { denganWeb } from './sajikanWeb.ts'

let app: ReturnType<typeof denganWeb>

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'web-dist-'))
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>CutiTerbang</title>')
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log(1)')
  const db = buatDb(':memory:')
  await jalankanMigrasi(db)
  app = denganWeb(buatApp(db), dir)
})

describe('denganWeb', () => {
  test('/api diteruskan ke API', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true)
  })

  test('berkas build disajikan apa adanya', async () => {
    const res = await app.request('/assets/app.js')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('console.log(1)')
  })

  test.each(['/', '/travel/status', '/simulator'])('rute SPA %s mendapat index.html', async (path) => {
    const res = await app.request(path)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<title>CutiTerbang</title>')
  })

  test('jalur /api yang tidak dikenal tetap 404, bukan index.html', async () => {
    const res = await app.request('/api/tidak-ada')
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain('<title>')
  })
})
