import { NAMA_APLIKASI } from '@cutiterbang/domain'
import { Hono } from 'hono'
import { buatGuard } from './akses/middleware.ts'
import { ruteAuth } from './akses/rute.ts'
import type { Db } from './db/client.ts'
import { resetData } from './db/reset.ts'

export function buatApp(db: Db) {
  const app = new Hono().basePath('/api')
  const { butuhLogin, butuhPeran } = buatGuard(db)

  app.get('/health', (c) => c.json({ ok: true, app: NAMA_APLIKASI }))
  app.route('/auth', ruteAuth(db))

  // Rute demo untuk guard peran; fase berikutnya menggantinya dengan rute sungguhan.
  app.get('/cuti/ping', butuhLogin, butuhPeran('HRDManajer'), (c) => c.json({ ok: true }))
  app.get('/tiket/saya/ping', butuhLogin, butuhPeran('CalonPenumpang'), (c) => c.json({ ok: true }))

  // Hanya untuk demo/tes: kembalikan data ke seed tanpa menghapus file DB.
  app.post('/dev/reset', async (c) => {
    await resetData(db)
    return c.body(null, 204)
  })

  return app
}

export type AppType = ReturnType<typeof buatApp>
