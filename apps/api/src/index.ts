import { serve } from '@hono/node-server'
import { buatApp } from './app.ts'
import { buatDb } from './db/client.ts'
import { jalankanMigrasi } from './db/migrate.ts'
import { seed } from './db/seed.ts'

const db = buatDb()
await jalankanMigrasi(db)
await seed(db) // idempoten: hanya mengisi yang belum ada

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: buatApp(db).fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api`)
})
