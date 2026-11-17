import { serve } from '@hono/node-server'
import { count } from 'drizzle-orm'
import { buatApp } from './app.ts'
import { buatDb } from './db/client.ts'
import { jalankanMigrasi } from './db/migrate.ts'
import { akun } from './db/schema.ts'
import { seed } from './db/seed.ts'

const db = buatDb()
await jalankanMigrasi(db)
const jumlahAkun = await db.select({ n: count() }).from(akun).get()
if (!jumlahAkun || jumlahAkun.n === 0) await seed(db)

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: buatApp(db).fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api`)
})
