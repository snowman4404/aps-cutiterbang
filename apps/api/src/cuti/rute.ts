// /api/cuti: semua rute hanya untuk HRDManajer dan hanya-baca.
import { Hono } from 'hono'
import type { TanggalIso } from '@cutiterbang/domain'
import { buatGuard, type Variabel } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaDataKepegawaian } from './antarmukaDataKepegawaian.ts'
import { buatPengendaliCuti } from './pengendaliCuti.ts'

const PESAN_PEGAWAI_TIDAK_DITEMUKAN = 'Pegawai tidak ditemukan'

export function ruteCuti(db: Db, hariIni: () => TanggalIso) {
  const { butuhLogin, butuhPeran } = buatGuard(db)
  const pengendali = buatPengendaliCuti(antarmukaDataKepegawaian(db), hariIni)
  const r = new Hono<Variabel>()
  r.use('*', butuhLogin, butuhPeran('HRDManajer'))

  r.get('/pengajuan', async (c) => {
    const hasil = await pengendali.tampilkanPengajuan(c.req.query('mulai'), c.req.query('akhir'))
    return 'galat' in hasil ? c.json(hasil, 400) : c.json(hasil)
  })

  r.get('/pegawai', async (c) => c.json(await pengendali.muatDaftarPegawai()))

  r.get('/pegawai/:nip/riwayat', async (c) => {
    const hasil = await pengendali.tampilkanRiwayat(c.req.param('nip'))
    return hasil ? c.json(hasil) : c.json({ pesan: PESAN_PEGAWAI_TIDAK_DITEMUKAN }, 404)
  })

  r.get('/pegawai/:nip/sisa', async (c) => {
    const hasil = await pengendali.tampilkanSisaCuti(c.req.param('nip'))
    return hasil ? c.json(hasil) : c.json({ pesan: PESAN_PEGAWAI_TIDAK_DITEMUKAN }, 404)
  })

  return r
}
