import { beforeEach, describe, expect, test } from 'vitest'
import {
  PESAN_AKHIR_SEBELUM_MULAI,
  PESAN_AKHIR_WAJIB,
  PESAN_BELUM_ADA_RIWAYAT,
  PESAN_MULAI_WAJIB,
  PESAN_TIDAK_ADA_AKSES,
  PESAN_TIDAK_ADA_PENGAJUAN,
} from '@cutiterbang/domain'
import { buatApp } from '../app.ts'
import { buatDb } from '../db/client.ts'
import { NIP } from '../db/dataCuti.ts'
import { jalankanMigrasi } from '../db/migrate.ts'
import { seed, SANDI_DEMO } from '../db/seed.ts'

// Seed dihitung dari 2026: 2 Feb 2026 = Senin, 14 Sep 2026 = Senin.
const HARI_INI = '2026-11-17'

let app: ReturnType<typeof buatApp>
let cookie = ''

const ambil = (path: string, c: string | undefined = cookie) =>
  app.request(`/api/cuti${path}`, { headers: c ? { Cookie: c } : {} })

const masuk = async (email: string) => {
  const res = await app.request('/api/auth/masuk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, kataSandi: SANDI_DEMO }),
  })
  return `sid=${/sid=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? ''}`
}

beforeEach(async () => {
  const db = buatDb(':memory:')
  await jalankanMigrasi(db)
  await seed(db, HARI_INI)
  app = buatApp(db, { hariIni: HARI_INI })
  cookie = await masuk('hrd@cutiterbang.test')
})

const RUTE = [
  '/pengajuan?mulai=2026-01-01&akhir=2026-12-31',
  '/pegawai',
  `/pegawai/${NIP.agus}/riwayat`,
  `/pegawai/${NIP.agus}/sisa`,
]

describe('akses', () => {
  test.each(RUTE)('tanpa login: 401 (%s)', async (r) => {
    expect((await ambil(r, '')).status).toBe(401)
  })

  test.each(RUTE)('bukan HRDManajer: 403 dan data tersembunyi (%s)', async (r) => {
    for (const email of ['penumpang@cutiterbang.test', 'travel@cutiterbang.test']) {
      const res = await ambil(r, await masuk(email))
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ pesan: PESAN_TIDAK_ADA_AKSES })
    }
  })
})

describe('GET /api/cuti/pengajuan (US-1a)', () => {
  test('kosong: 400 dengan galat per kolom', async () => {
    const res = await ambil('/pengajuan')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { mulai: PESAN_MULAI_WAJIB, akhir: PESAN_AKHIR_WAJIB } })
  })

  test('tanggal akhir lebih awal dari mulai: 400 pada kolom akhir', async () => {
    const res = await ambil('/pengajuan?mulai=2026-02-10&akhir=2026-02-09')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ galat: { akhir: PESAN_AKHIR_SEBELUM_MULAI } })
  })

  test('Diajukan dan Disetujui yang beririsan, urut tanggalMulai naik, dengan lamaCuti', async () => {
    const res = await ambil('/pengajuan?mulai=2026-02-01&akhir=2026-04-30')
    expect(res.status).toBe(200)
    const { pengajuan } = await res.json()
    expect(pengajuan.map((p: { namaPegawai: string; tanggalMulai: string; lamaCuti: number }) => [p.namaPegawai, p.tanggalMulai, p.lamaCuti])).toEqual([
      ['Agus Setiawan', '2026-02-02', 5],
      ['Gunawan Wibowo', '2026-02-16', 5],
      ['Fitri Handayani', '2026-03-02', 5],
      ['Agus Setiawan', '2026-04-06', 10],
    ])
    expect(pengajuan[0]).toMatchObject({ tanggalAkhir: '2026-02-06', status: 'Disetujui' })
  })

  test('ujung yang bersentuhan ikut', async () => {
    const res = await ambil('/pengajuan?mulai=2026-02-06&akhir=2026-02-06')
    expect((await res.json()).pengajuan).toHaveLength(1)
  })

  test('Ditolak tidak muncul; tidak ada hasil -> pesan', async () => {
    const res = await ambil('/pengajuan?mulai=2026-05-18&akhir=2026-05-19')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ pengajuan: [], pesan: PESAN_TIDAK_ADA_PENGAJUAN })
  })

  test('lamaCuti melewati akhir pekan dan hari libur (cuti bersama)', async () => {
    const res = await ambil('/pengajuan?mulai=2026-09-14&akhir=2026-09-14')
    const { pengajuan } = await res.json()
    expect(pengajuan).toHaveLength(1)
    expect(pengajuan[0]).toMatchObject({ namaPegawai: 'Dewi Kartika', tanggalAkhir: '2026-09-21', lamaCuti: 5 })
  })
})

describe('GET /api/cuti/pegawai', () => {
  test('daftar nama + NIP, urut nama', async () => {
    const { pegawai } = await (await ambil('/pegawai')).json()
    expect(pegawai).toHaveLength(8)
    expect(pegawai[0]).toEqual({ nama: 'Agus Setiawan', nomorIndukPegawai: NIP.agus })
    const nama = pegawai.map((p: { nama: string }) => p.nama)
    expect(nama).toEqual([...nama].sort())
  })
})

describe('GET /api/cuti/pegawai/:nip/riwayat (US-1b)', () => {
  test('hanya Disetujui yang mulai tahun ini, terbaru dulu; lintas tahun hanya di tahun mulainya', async () => {
    const res = await ambil(`/pegawai/${NIP.gunawan}/riwayat`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tahun).toBe(2026)
    expect(body.riwayat).toEqual([
      { tanggalMulai: '2026-12-28', tanggalAkhir: '2027-01-05', lamaCuti: 6 },
      { tanggalMulai: '2026-02-16', tanggalAkhir: '2026-02-20', lamaCuti: 5 },
    ])
  })

  test('tidak ada: pesan "Belum ada riwayat cuti" (cuti tahun lalu, Ditolak, Diajukan tidak dihitung)', async () => {
    const body = await (await ambil(`/pegawai/${NIP.eko}/riwayat`)).json()
    expect(body.riwayat).toEqual([])
    expect(body.pesan).toBe(PESAN_BELUM_ADA_RIWAYAT)
  })

  test('NIP tidak dikenal: 404', async () => {
    expect((await ambil('/pegawai/000/riwayat')).status).toBe(404)
  })
})

describe('GET /api/cuti/pegawai/:nip/sisa (US-1c)', () => {
  test('sisa = jatah - hari kerja Disetujui tahun ini', async () => {
    const body = await (await ambil(`/pegawai/${NIP.gunawan}/sisa`)).json()
    expect(body).toMatchObject({ jatahCutiTahunan: 12, cutiTerpakai: 11, sisaCuti: 1, melebihiJatah: false })
  })

  test('tanpa cuti disetujui: sisa = jatah', async () => {
    const body = await (await ambil(`/pegawai/${NIP.eko}/sisa`)).json()
    expect(body).toMatchObject({ cutiTerpakai: 0, sisaCuti: 12, melebihiJatah: false })
  })

  test('melebihi jatah: sisa negatif apa adanya', async () => {
    const body = await (await ambil(`/pegawai/${NIP.fitri}/sisa`)).json()
    expect(body).toMatchObject({ cutiTerpakai: 15, sisaCuti: -3, melebihiJatah: true })
  })

  test('NIP tidak dikenal: 404', async () => {
    expect((await ambil('/pegawai/000/sisa')).status).toBe(404)
  })
})

describe('seed', () => {
  test('idempoten: seed ulang tidak menggandakan data', async () => {
    const db = buatDb(':memory:')
    await jalankanMigrasi(db)
    await seed(db, HARI_INI)
    await seed(db, HARI_INI)
    const a = buatApp(db, { hariIni: HARI_INI })
    const res = await a.request('/api/cuti/pengajuan?mulai=2026-02-01&akhir=2026-04-30', {
      headers: { Cookie: await masukKe(a) },
    })
    expect((await res.json()).pengajuan).toHaveLength(4)
  })
})

async function masukKe(a: ReturnType<typeof buatApp>) {
  const res = await a.request('/api/auth/masuk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hrd@cutiterbang.test', kataSandi: SANDI_DEMO }),
  })
  return `sid=${/sid=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? ''}`
}
