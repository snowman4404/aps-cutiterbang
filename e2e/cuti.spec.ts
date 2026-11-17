import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  hariIniWib,
  lamaCuti,
  pengajuanPadaPeriode,
  riwayatCuti,
  sisaCuti,
  tahunDari,
  type PengajuanCuti,
} from '@cutiterbang/domain'
import { buatDataCuti, NIP } from '../apps/api/src/db/dataCuti.ts'

const SANDI = 'rahasia123'
const TIDAK_ADA_AKSES = 'Anda tidak memiliki akses ke halaman ini'

// Seed dihitung dari tahun berjalan (WIB); harapan dihitung dari data yang sama dengan aturan domain.
const HARI_INI = hariIniWib()
const TAHUN = tahunDari(HARI_INI)
const DATA = buatDataCuti(TAHUN)
const LIBUR = DATA.hariLibur.map((h) => h.tanggal)
const namaDari = (nip: string) => DATA.pegawai.find((p) => p.nomorIndukPegawai === nip)!.nama
const cutiDari = (nip: string): (PengajuanCuti & { nomorIndukPegawai: string })[] =>
  DATA.pengajuan.filter((p) => p.nomorIndukPegawai === nip)

const FORMAT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const tanggal = (iso: string) => FORMAT.format(new Date(`${iso}T00:00:00Z`))
const hari = (n: number) => `${n} hari kerja`

test.beforeEach(async ({ request }) => {
  const res = await request.post('http://localhost:8787/api/dev/reset')
  expect(res.status()).toBe(204)
})

async function masuk(page: Page, email: string) {
  await page.goto('/masuk')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(SANDI)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page.getByTestId('pengguna')).toBeVisible()
}

const masukHrd = (page: Page) => masuk(page, 'hrd@cutiterbang.test')

test.describe('US-1a Melihat pengajuan cuti per periode', () => {
  test('daftar urut tanggal mulai naik dengan kolom lengkap; Ditolak tidak tampil', async ({ page }) => {
    await masukHrd(page)
    await page.goto('/cuti/pengajuan')
    await page.getByLabel('Tanggal mulai').fill(`${TAHUN}-01-01`)
    await page.getByLabel('Tanggal akhir').fill(`${TAHUN}-12-31`)
    await page.getByRole('button', { name: 'Tampilkan' }).click()

    const harapan = pengajuanPadaPeriode(DATA.pengajuan, `${TAHUN}-01-01`, `${TAHUN}-12-31`)
    expect(harapan.length).toBeGreaterThan(5)
    expect(harapan.map((p) => p.tanggalMulai)).toEqual(harapan.map((p) => p.tanggalMulai).sort())
    const baris = page.getByRole('table', { name: 'Daftar pengajuan cuti' }).locator('tbody tr')
    await expect(baris).toHaveCount(harapan.length)
    for (const [i, p] of harapan.entries()) {
      const sel = baris.nth(i).locator('td')
      await expect(sel.nth(0)).toHaveText(namaDari(p.nomorIndukPegawai))
      await expect(sel.nth(1)).toHaveText(tanggal(p.tanggalMulai))
      await expect(sel.nth(2)).toHaveText(tanggal(p.tanggalAkhir))
      await expect(sel.nth(3)).toHaveText(hari(lamaCuti(p, LIBUR)))
      await expect(sel.nth(4)).toHaveText(p.status)
    }
    await expect(page.getByRole('columnheader')).toHaveText([
      'Nama pegawai',
      'Tanggal mulai',
      'Tanggal akhir',
      'Lama cuti',
      'Status',
    ])
    await expect(baris.filter({ hasText: 'Ditolak' })).toHaveCount(0)
  })

  test('cuti yang melewati akhir pekan dan hari libur dihitung hari kerjanya saja', async ({ page }) => {
    await masukHrd(page)
    await page.goto('/cuti/pengajuan')
    const dewi = cutiDari(NIP.dewi).find((p) => LIBUR.includes(p.tanggalMulai) === false && p.status === 'Disetujui' && lamaCuti(p, LIBUR) < lamaCuti(p, []))!
    await page.getByLabel('Tanggal mulai').fill(dewi.tanggalMulai)
    await page.getByLabel('Tanggal akhir').fill(dewi.tanggalMulai)
    await page.getByRole('button', { name: 'Tampilkan' }).click()
    const baris = page.getByRole('table', { name: 'Daftar pengajuan cuti' }).locator('tbody tr')
    await expect(baris).toHaveCount(1)
    await expect(baris.first().locator('td').nth(3)).toHaveText(hari(lamaCuti(dewi, LIBUR)))
  })

  test('periode tanpa pengajuan menampilkan pesan', async ({ page }) => {
    await masukHrd(page)
    await page.goto('/cuti/pengajuan')
    // Hanya cuti Ditolak pada periode ini, jadi hasilnya kosong.
    const ditolak = DATA.pengajuan.find((p) => p.status === 'Ditolak')!
    expect(pengajuanPadaPeriode(DATA.pengajuan, ditolak.tanggalMulai, ditolak.tanggalAkhir)).toEqual([])
    await page.getByLabel('Tanggal mulai').fill(ditolak.tanggalMulai)
    await page.getByLabel('Tanggal akhir').fill(ditolak.tanggalAkhir)
    await page.getByRole('button', { name: 'Tampilkan' }).click()
    await expect(page.getByText('Tidak ada pengajuan cuti pada periode ini')).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('tanggal kosong atau akhir lebih awal dari mulai: galat pada kolom yang salah', async ({ page }) => {
    await masukHrd(page)
    await page.goto('/cuti/pengajuan')
    await page.getByRole('button', { name: 'Tampilkan' }).click()
    await expect(page.getByText('Tanggal mulai wajib diisi')).toBeVisible()
    await expect(page.getByText('Tanggal akhir wajib diisi')).toBeVisible()
    await expect(page.getByLabel('Tanggal mulai')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Tanggal akhir')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Tanggal mulai').fill(`${TAHUN}-03-10`)
    await page.getByLabel('Tanggal akhir').fill(`${TAHUN}-03-09`)
    await page.getByRole('button', { name: 'Tampilkan' }).click()
    await expect(page.getByText('Tanggal akhir tidak boleh lebih awal dari tanggal mulai')).toBeVisible()
    await expect(page.getByText('Tanggal mulai wajib diisi')).toHaveCount(0)
    await expect(page.getByLabel('Tanggal akhir')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Tanggal mulai')).not.toHaveAttribute('aria-invalid', 'true')
  })
})

test.describe('US-1b Melihat riwayat cuti pegawai', () => {
  test('riwayat urut terbaru dulu; hanya Disetujui yang mulai tahun ini', async ({ page }) => {
    await masukHrd(page)
    await page.goto('/cuti/riwayat')
    await expect(page.getByLabel('Pegawai').locator('option')).toHaveCount(DATA.pegawai.length + 1)
    await page.getByLabel('Pegawai').selectOption(NIP.gunawan)
    await expect(page).toHaveURL(new RegExp(`nip=${NIP.gunawan}`))

    const harapan = riwayatCuti(cutiDari(NIP.gunawan), HARI_INI)
    expect(harapan.length).toBe(2) // lintas tahun hanya di tahun mulainya; cuti tahun lalu tidak ikut
    const baris = page.getByRole('table', { name: 'Riwayat cuti' }).locator('tbody tr')
    await expect(baris).toHaveCount(harapan.length)
    for (const [i, p] of harapan.entries()) {
      const sel = baris.nth(i).locator('td')
      await expect(sel.nth(0)).toHaveText(tanggal(p.tanggalMulai))
      await expect(sel.nth(1)).toHaveText(tanggal(p.tanggalAkhir))
      await expect(sel.nth(2)).toHaveText(hari(lamaCuti(p, LIBUR)))
    }
    await expect(page.getByRole('columnheader')).toHaveText(['Tanggal mulai', 'Tanggal akhir', 'Lama cuti'])
  })

  test('pegawai tanpa cuti disetujui tahun ini: "Belum ada riwayat cuti"', async ({ page }) => {
    await masukHrd(page)
    await page.goto(`/cuti/riwayat?nip=${NIP.eko}`)
    await expect(page.getByLabel('Pegawai')).toHaveValue(NIP.eko)
    await expect(page.getByText('Belum ada riwayat cuti')).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  })
})

test.describe('US-1c Melihat sisa cuti pegawai', () => {
  test('sisa cuti = jatah dikurangi hari kerja cuti disetujui tahun ini', async ({ page }) => {
    await masukHrd(page)
    await page.goto('/cuti/sisa')
    await page.getByLabel('Pegawai').selectOption(NIP.gunawan)
    const sisa = sisaCuti(12, cutiDari(NIP.gunawan), HARI_INI, LIBUR)
    await expect(page.getByTestId('sisa-cuti')).toHaveText(hari(sisa))
    await expect(page.getByText('Jatah cuti tahunan', { exact: true })).toBeVisible()
    await expect(page.getByText('Melebihi jatah')).toHaveCount(0)
  })

  test('sisa negatif ditampilkan apa adanya dan ditandai melebihi jatah', async ({ page }) => {
    await masukHrd(page)
    await page.goto('/cuti/sisa')
    await page.getByLabel('Pegawai').selectOption(NIP.fitri)
    const sisa = sisaCuti(12, cutiDari(NIP.fitri), HARI_INI, LIBUR)
    expect(sisa).toBeLessThan(0)
    await expect(page.getByTestId('sisa-cuti')).toHaveText(hari(sisa))
    await expect(page.getByText('Melebihi jatah')).toBeVisible()
  })
})

test.describe('akses non-HRD', () => {
  for (const path of ['/cuti/pengajuan', '/cuti/riwayat', '/cuti/sisa']) {
    test(`Calon Penumpang membuka ${path}: tidak punya akses`, async ({ page }) => {
      await masuk(page, 'penumpang@cutiterbang.test')
      await page.goto(path)
      await expect(page.getByText(TIDAK_ADA_AKSES)).toBeVisible()
      await expect(page.getByRole('table')).toHaveCount(0)
      await expect(page.getByLabel('Pegawai')).toHaveCount(0)
      await expect(page.getByLabel('Tanggal mulai')).toHaveCount(0)
    })
  }
})
