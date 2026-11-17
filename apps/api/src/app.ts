import { hariIniWib, NAMA_APLIKASI, type TanggalIso } from '@cutiterbang/domain'
import { Hono } from 'hono'
import { ruteAuth } from './akses/rute.ts'
import { ruteCuti } from './cuti/rute.ts'
import type { Db } from './db/client.ts'
import { resetData } from './db/reset.ts'
import { rutePenerbangan } from './tiket/rute.ts'
import { rutePemesanan } from './tiket/rutePemesanan.ts'

export interface OpsiApp {
  /** "Hari ini" (WIB) yang disuntik, untuk tes; bawaan: tanggal server menurut Asia/Jakarta. */
  hariIni?: TanggalIso
  /** "Sekarang" yang disuntik, untuk tes; bawaan: jam server. Dipakai untuk /tersedia (sudah berangkat atau belum). */
  sekarang?: () => Date
}

export function buatApp(db: Db, opsi: OpsiApp = {}) {
  const app = new Hono().basePath('/api')

  app.get('/health', (c) => c.json({ ok: true, app: NAMA_APLIKASI }))
  app.route('/auth', ruteAuth(db))

  app.route('/cuti', ruteCuti(db, () => opsi.hariIni ?? hariIniWib()))

  app.route('/penerbangan', rutePenerbangan(db, () => opsi.hariIni ?? hariIniWib(), () => opsi.sekarang?.() ?? new Date()))
  app.route('/pemesanan', rutePemesanan(db, () => opsi.hariIni ?? hariIniWib(), () => opsi.sekarang?.() ?? new Date()))

  // Hanya untuk demo/tes: kembalikan data ke seed tanpa menghapus file DB.
  app.post('/dev/reset', async (c) => {
    await resetData(db)
    return c.body(null, 204)
  })

  return app
}

export type AppType = ReturnType<typeof buatApp>
