import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { NAMA_APLIKASI } from '@cutiterbang/domain'

const app = new Hono().basePath('/api')

app.get('/health', (c) => c.json({ ok: true, app: NAMA_APLIKASI }))

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api`)
})

export type AppType = typeof app
