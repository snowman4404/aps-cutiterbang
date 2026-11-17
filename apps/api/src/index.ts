import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { buatApp } from './app.ts'
import { buatDb } from './db/client.ts'
import { siapkanDb } from './db/siapkan.ts'
import { sajikanWeb } from './sajikanWeb.ts'

const db = buatDb()
await siapkanDb(db, { resetSaatMulai: process.env.RESET_SAAT_MULAI === '1' })

// Bila hasil build web ada (npm run build), server ini juga menyajikannya: satu proses Node untuk mode produksi.
const app = sajikanWeb(buatApp(db), fileURLToPath(new URL('../../web/dist', import.meta.url)))

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port} (API at /api)`)
})
