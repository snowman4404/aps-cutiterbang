// /api/cuti: semua rute hanya untuk HRDManajer dan hanya-baca.
import { Hono } from 'hono'
import { PESAN_TIDAK_ADA_AKSES, type TanggalIso } from '@cutiterbang/domain'
import { createMiddleware } from 'hono/factory'
import { buatGuard, type Variabel } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaDataKepegawaian } from './antarmukaDataKepegawaian.ts'
import { buatPengendaliCuti } from './pengendaliCuti.ts'

const PESAN_PEGAWAI_TIDAK_DITEMUKAN = 'Pegawai tidak ditemukan'

export function ruteCuti(db: Db, hariIni: () => TanggalIso) {
  const { butuhLogin } = buatGuard(db)
  const pengendali = buatPengendaliCuti(antarmukaDataKepegawaian(db), hariIni)
  // periksaPeran milik control (HRDManajer); responsnya sama dengan `butuhPeran`.
  const periksaPeran = createMiddleware<Variabel>(async (c, next) => {
    if (!pengendali.periksaPeran(c.get('akun'))) return c.json({ pesan: PESAN_TIDAK_ADA_AKSES }, 403)
    await next()
  })
  const rute = new Hono<Variabel>()
  rute.use('*', butuhLogin, periksaPeran)

  rute.get('/pengajuan', async (c) => {
    const hasil = await pengendali.tampilkanPengajuan(c.req.query('mulai'), c.req.query('akhir'))
    return 'galat' in hasil ? c.json(hasil, 400) : c.json(hasil)
  })

  rute.get('/pegawai', async (c) => c.json(await pengendali.muatDaftarPegawai()))

  rute.get('/pegawai/:nip/riwayat', async (c) => {
    const hasil = await pengendali.tampilkanRiwayat(c.req.param('nip'))
    return hasil ? c.json(hasil) : c.json({ pesan: PESAN_PEGAWAI_TIDAK_DITEMUKAN }, 404)
  })

  rute.get('/pegawai/:nip/sisa', async (c) => {
    const hasil = await pengendali.tampilkanSisaCuti(c.req.param('nip'))
    return hasil ? c.json(hasil) : c.json({ pesan: PESAN_PEGAWAI_TIDAK_DITEMUKAN }, 404)
  })

  return rute
}
