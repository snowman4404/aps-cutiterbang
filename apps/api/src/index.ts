import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { buatApp } from './app.ts'
import { buatDb } from './db/client.ts'
import { jalankanMigrasi } from './db/migrate.ts'
import { resetData } from './db/reset.ts'
import { seed } from './db/seed.ts'
import { denganWeb } from './sajikanWeb.ts'

const db = buatDb()
await jalankanMigrasi(db)
// Deploy demo: RESET_SAAT_MULAI=1 mengembalikan data ke seed tiap kali server mulai (tanggal seed relatif ke hari ini).
if (process.env.RESET_SAAT_MULAI === '1') await resetData(db)
else await seed(db) // idempoten: hanya mengisi yang belum ada

// Bila hasil build web ada (npm run build), layanan ini juga menyajikannya: satu layanan Node untuk produksi.
const DIR_WEB = fileURLToPath(new URL('../../web/dist', import.meta.url))
const api = buatApp(db)
const sajikanWeb = existsSync(`${DIR_WEB}/index.html`)
const app = sajikanWeb ? denganWeb(api, DIR_WEB) : api

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api${sajikanWeb ? ' (web app served at /)' : ''}`)
})
