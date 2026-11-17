import { hariIniWib, NAMA_APLIKASI, type TanggalIso } from '@cutiterbang/domain'
import { Hono } from 'hono'
import { ruteAuth } from './akses/rute.ts'
import { ruteCuti } from './cuti/rute.ts'
import type { Db } from './db/client.ts'
import { resetData } from './db/reset.ts'
import { rutePenerbangan } from './tiket/rute.ts'
import { rutePemesanan } from './tiket/rutePemesanan.ts'
import { ruteProfil } from './tiket/ruteProfil.ts'
import { ruteSimulasi } from './tiket/ruteSimulasi.ts'
import { ruteTiketDipesankan } from './tiket/ruteTiketDipesankan.ts'
import { ruteTravel } from './tiket/ruteTravel.ts'
import { ruteValidasiTiket } from './tiket/ruteValidasiTiket.ts'

/** Variabel lingkungan yang menentukan apakah reset data demo boleh dipakai. */
export interface LingkunganReset {
  NODE_ENV?: string
  IZINKAN_RESET?: string
}

/** Reset data demo aktif di luar produksi; di produksi hanya bila IZINKAN_RESET=1. */
export function resetDiizinkan(lingkungan: LingkunganReset = process.env): boolean {
  return lingkungan.NODE_ENV !== 'production' || lingkungan.IZINKAN_RESET === '1'
}

export interface OpsiApp {
  /** "Hari ini" (WIB) yang disuntik, untuk tes; bawaan: tanggal server menurut Asia/Jakarta. */
  hariIni?: TanggalIso
  /** "Sekarang" yang disuntik, untuk tes; bawaan: jam server. Dipakai untuk /tersedia (sudah berangkat atau belum). */
  sekarang?: () => Date
  /** Lingkungan yang disuntik, untuk tes gerbang reset; bawaan: `process.env`. */
  lingkungan?: LingkunganReset
}

export function buatApp(db: Db, opsi: OpsiApp = {}) {
  const app = new Hono().basePath('/api')
  const resetAktif = () => resetDiizinkan(opsi.lingkungan ?? process.env)

  app.get('/health', (c) => c.json({ ok: true, app: NAMA_APLIKASI, resetAktif: resetAktif() }))
  app.route('/auth', ruteAuth(db))

  app.route('/cuti', ruteCuti(db, () => opsi.hariIni ?? hariIniWib()))

  app.route('/penerbangan', rutePenerbangan(db, () => opsi.hariIni ?? hariIniWib(), () => opsi.sekarang?.() ?? new Date()))
  app.route('/pemesanan', rutePemesanan(db, () => opsi.hariIni ?? hariIniWib(), () => opsi.sekarang?.() ?? new Date()))
  app.route('/travel', ruteTravel(db, () => opsi.hariIni ?? hariIniWib(), () => opsi.sekarang?.() ?? new Date()))
  app.route('/tiket-dipesankan', ruteTiketDipesankan(db, () => opsi.sekarang?.() ?? new Date()))
  app.route('/profil', ruteProfil(db, () => opsi.hariIni ?? hariIniWib()))
  app.route('/validasi-tiket', ruteValidasiTiket(db, () => opsi.hariIni ?? hariIniWib(), () => opsi.sekarang?.() ?? new Date()))

  // Sistem luar yang disimulasikan (pembayaran, maskapai): sama dengan dev/reset, mati (404) di produksi kecuali IZINKAN_RESET=1.
  app.route('/simulasi', ruteSimulasi(db, () => opsi.sekarang?.() ?? new Date(), resetAktif))

  // Hanya untuk demo/tes: kembalikan data ke seed tanpa menghapus file DB. Mati (404) di produksi kecuali IZINKAN_RESET=1.
  app.post('/dev/reset', async (c) => {
    if (!resetAktif()) return c.notFound()
    await resetData(db)
    return c.body(null, 204)
  })

  return app
}

export type AppType = ReturnType<typeof buatApp>
