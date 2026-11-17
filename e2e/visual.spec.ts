// Tangkapan layar untuk tinjauan gaya: `npm run test:visual` (proyek Playwright "visual";
// proyek bawaan `chromium` mengabaikan berkas ini).
// Hasil: .taste-skill/app-shots/*.png (diabaikan git).
import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const FOLDER = '.taste-skill/app-shots'
const SANDI = 'rahasia123'
const UKURAN = [
  { nama: '1440', lebar: 1440, tinggi: 900 },
  { nama: '390', lebar: 390, tinggi: 844 },
]
const SKEMA = ['light', 'dark'] as const

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

test.beforeAll(() => mkdirSync(FOLDER, { recursive: true }))
test.beforeEach(async ({ request }) => {
  expect((await request.post('http://localhost:8787/api/dev/reset')).status()).toBe(204)
})

for (const u of UKURAN) {
  for (const skema of SKEMA) {
    test(`tangkapan ${u.nama} ${skema}`, async ({ browser }) => {
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

      await page.request.post('http://localhost:8787/api/auth/keluar')
      await masuk(page, 'hrd@cutiterbang.test')
      await page.goto('/cuti/pengajuan')
      await expect(page.getByRole('heading', { name: 'Pengajuan Cuti' })).toBeVisible()
      await simpan('cuti-pengajuan-hrd')

      await page.request.post('http://localhost:8787/api/auth/keluar')
      await masuk(page, 'penumpang@cutiterbang.test')
      await page.goto('/cuti/pengajuan')
      await expect(page.getByRole('alert')).toBeVisible()
      await simpan('tanpa-akses-penumpang')

      await ctx.close()
    })
  }
}
