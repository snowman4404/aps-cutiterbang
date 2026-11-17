// Mode produksi (satu proses Node): API di /api dan hasil build web (apps/web/dist) di jalur lain, dengan fallback SPA ke
// index.html supaya rute React Router (mis. /travel/status) bisa dibuka langsung. Jalur /api yang tidak dikenal tetap 404.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

interface AplikasiFetch {
  fetch: (req: Request) => Response | Promise<Response>
}

/** `api` saja bila `dirWeb` belum berisi build (npm run dev), selain itu `api` ditambah hasil build web. */
export function sajikanWeb(api: AplikasiFetch, dirWeb: string): AplikasiFetch {
  if (!existsSync(join(dirWeb, 'index.html'))) return api
  const app = new Hono()
  app.all('/api/*', (c) => api.fetch(c.req.raw))
  app.use('*', serveStatic({ root: dirWeb }))
  app.get('*', serveStatic({ root: dirWeb, path: 'index.html' }))
  return app
}
