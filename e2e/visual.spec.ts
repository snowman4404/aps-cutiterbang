// Tangkapan layar untuk tinjauan gaya: `npm run test:visual` (proyek Playwright "visual";
// proyek bawaan `chromium` mengabaikan berkas ini).
// Hasil: .taste-skill/app-shots/*.png (diabaikan git).
import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { hariIniWib, tambahHari } from '@cutiterbang/domain'
import { DEMO } from '../apps/api/src/db/dataPenerbangan.ts'

const FOLDER = '.taste-skill/app-shots'
const SANDI = 'rahasia123'
const UKURAN = [
  { nama: '1440', lebar: 1440, tinggi: 900 },
  { nama: '390', lebar: 390, tinggi: 844 },
]
const SKEMA = ['light', 'dark'] as const
const { asal: ASAL, tujuan: TUJUAN, hariKe: HARI_KE } = DEMO.rutePadat
const TANGGAL = tambahHari(hariIniWib(), HARI_KE)
const TANGGAL_2 = tambahHari(hariIniWib(), HARI_KE + 1)

async function masuk(page: Page, email: string) {
  await page.goto('/masuk')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(SANDI)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page.getByTestId('pengguna')).toBeAttached()
}

async function cekTanpaGulirSamping(page: Page) {
  const lebih = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(lebih).toBeLessThanOrEqual(0)
}

async function ganti(page: Page, email: string) {
  await page.request.post('http://localhost:8787/api/auth/keluar')
  await masuk(page, email)
}

async function cari(page: Page, alamat: string) {
  await page.goto(alamat)
  await expect(page.getByLabel('Kota asal').locator('option').nth(1)).toBeAttached()
  await page.getByLabel('Kota asal').selectOption({ label: ASAL })
  await page.getByLabel('Kota tujuan').selectOption({ label: TUJUAN })
  await page.getByLabel('Tanggal keberangkatan').fill(TANGGAL)
  if (alamat === '/travel/cari') await page.getByLabel('Jumlah penumpang').fill('2')
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
  await expect(page.getByTestId('penerbangan').first()).toBeVisible()
}

test.beforeAll(() => mkdirSync(FOLDER, { recursive: true }))
test.beforeEach(async ({ request }) => {
  expect((await request.post('http://localhost:8787/api/dev/reset')).status()).toBe(204)
})

for (const u of UKURAN) {
  for (const skema of SKEMA) {
    test(`tangkapan ${u.nama} ${skema}`, async ({ browser }) => {
      test.setTimeout(180_000)
      const ctx = await browser.newContext({ viewport: { width: u.lebar, height: u.tinggi }, colorScheme: skema })
      const page = await ctx.newPage()
      const simpan = async (nama: string) => {
        await cekTanpaGulirSamping(page)
        await page.screenshot({ path: `${FOLDER}/${nama}-${u.nama}-${skema}.png`, fullPage: true })
      }

      await page.goto('/masuk')
      await expect(page.getByRole('heading', { name: 'Masuk' })).toBeVisible()
      await simpan('masuk')

      await page.goto('/daftar')
      await page.getByRole('button', { name: 'Daftar', exact: true }).click()
      await expect(page.getByText('Nama harus 1 sampai 100 karakter')).toBeVisible()
      await simpan('daftar-galat')

      await masuk(page, 'member1@cutiterbang.test')
      await page.goto('/')
      await expect(page.getByRole('heading', { name: /Halo, / })).toBeVisible()
      await simpan('beranda-member')
      if (u.lebar < 1100) {
        await page.getByRole('button', { name: 'Buka menu' }).click()
        await expect(page.getByRole('button', { name: 'Tutup menu' })).toBeVisible()
        await simpan('menu-terbuka-member')
      }

      await ganti(page, 'hrd@cutiterbang.test')
      await page.goto('/cuti/pengajuan')
      await expect(page.getByRole('heading', { name: 'Pengajuan Cuti' })).toBeVisible()
      await simpan('cuti-pengajuan-hrd')
      const tahun = new Date().getFullYear()
      await page.getByLabel('Tanggal mulai').fill(`${tahun}-01-01`)
      await page.getByLabel('Tanggal akhir').fill(`${tahun}-12-31`)
      await page.getByRole('button', { name: 'Tampilkan' }).click()
      await page.waitForLoadState('networkidle')
      await simpan('cuti-pengajuan-hasil-hrd')
      for (const [alamat, judul] of [
        ['/cuti/riwayat', 'Riwayat Cuti'],
        ['/cuti/sisa', 'Sisa Cuti'],
      ]) {
        await page.goto(alamat!)
        await expect(page.getByRole('heading', { name: judul })).toBeVisible()
        await expect(page.getByLabel('Pegawai').locator('option').nth(1)).toBeAttached()
        await page.getByLabel('Pegawai').selectOption({ index: 1 })
        await page.waitForLoadState('networkidle')
        await simpan(alamat!.replace('/cuti/', 'cuti-') + '-hrd')
      }

      await ganti(page, 'penumpang@cutiterbang.test')
      await page.goto('/cuti/pengajuan')
      await expect(page.getByRole('alert')).toBeVisible()
      await simpan('tanpa-akses-penumpang')
      await cari(page, '/penerbangan')
      await simpan('penerbangan-hasil-penumpang')
      await page.getByRole('link', { name: /^Pesan / }).first().click()
      await expect(page.getByRole('heading', { name: 'Pesan Tiket' })).toBeVisible()
      await simpan('pesan-penumpang')
      await page.getByLabel('Nama lengkap').fill('')
      await page.getByRole('button', { name: 'Lanjut' }).click()
      await simpan('pesan-galat-penumpang')
      await page.goto('/tiket-saya')
      await page.waitForLoadState('networkidle')
      await simpan('tiket-saya-penumpang')
      await page.getByRole('button', { name: 'Batalkan' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await simpan('tiket-saya-dialog-penumpang')

      await ganti(page, 'member1@cutiterbang.test')
      await page.goto('/penerbangan/multi')
      const seg = (n: number) => page.getByRole('group', { name: `Segmen ${n}` })
      await expect(seg(1).getByLabel('Kota asal').locator('option').nth(1)).toBeAttached()
      await seg(1).getByLabel('Kota asal').selectOption({ label: ASAL })
      await seg(1).getByLabel('Kota tujuan').selectOption({ label: TUJUAN })
      await seg(1).getByLabel('Tanggal keberangkatan').fill(TANGGAL)
      await seg(2).getByLabel('Kota asal').selectOption({ label: TUJUAN })
      await seg(2).getByLabel('Kota tujuan').selectOption({ label: 'Makassar' })
      await seg(2).getByLabel('Tanggal keberangkatan').fill(TANGGAL_2)
      await page.getByRole('button', { name: 'Cari', exact: true }).click()
      await expect(page.getByRole('region', { name: 'Hasil segmen 1' })).toBeVisible()
      await page.waitForLoadState('networkidle')
      await simpan('multi-hasil-member')
      await page.goto('/profil')
      await page.waitForLoadState('networkidle')
      await simpan('profil-member')
      await page.goto('/validasi-tiket')
      await page.getByLabel('Kode booking reference').fill('CTB005')
      await page.getByRole('button', { name: 'Validasi', exact: true }).click()
      await page.waitForLoadState('networkidle')
      await simpan('validasi-tiket-member')

      await ganti(page, 'travel@cutiterbang.test')
      await cari(page, '/travel/cari')
      await simpan('travel-cari-hasil')
      await page.getByRole('link', { name: /Pesan untuk pengunjung/ }).first().click()
      await page.waitForLoadState('networkidle')
      await simpan('travel-pesan')
      await page.goto('/travel/status')
      await expect(page.getByTestId('baris-status').first()).toBeVisible()
      await simpan('travel-status')
      await page.goto('/travel/cek-kode')
      await page.getByLabel('Kode booking reference').fill('CTB007')
      await page.getByRole('button', { name: 'Periksa' }).click()
      await expect(page.getByLabel('Status booking')).toBeVisible()
      await simpan('travel-cek-kode')
      await page.goto('/simulator')
      await page.waitForLoadState('networkidle')
      await simpan('simulator')

      await ganti(page, 'pengunjung1@cutiterbang.test')
      await page.goto('/tiket-dipesankan')
      await page.waitForLoadState('networkidle')
      await simpan('tiket-dipesankan-pengunjung')

      await ctx.close()
    })
  }
}
