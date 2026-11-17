import { expect, test } from '@playwright/test'

const KUNCI = 'cutiterbang-tema'

test('tombol tema berputar Perangkat -> Terang -> Gelap -> Perangkat dan pilihannya bertahan', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  const html = page.locator('html')
  const simpan = () => page.evaluate((kunci) => localStorage.getItem(kunci), KUNCI)

  // Perangkat (bawaan): tanpa atribut dan tanpa kunci; prefers-color-scheme yang berlaku.
  await expect(html).not.toHaveAttribute('data-theme', /.*/)
  expect(await simpan()).toBeNull()
  await expect(page.getByRole('button', { name: 'Tema: Perangkat' })).toBeVisible()
  const latar = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(await latar()).toBe('rgb(22, 24, 25)')

  // Terang: dipaksa terang walau perangkat gelap.
  await page.getByRole('button', { name: 'Tema: Perangkat' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Tema: Terang' })).toBeVisible()
  expect(await simpan()).toBe('light')
  expect(await latar()).toBe('rgb(239, 243, 246)')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Tema: Terang' })).toBeVisible()

  // Gelap.
  await page.getByRole('button', { name: 'Tema: Terang' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Tema: Gelap' })).toBeVisible()
  expect(await simpan()).toBe('dark')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Tema: Gelap' })).toBeVisible()

  // Kembali ke Perangkat: atribut dan kunci dihapus, dan tetap begitu setelah dimuat ulang.
  await page.getByRole('button', { name: 'Tema: Gelap' }).click()
  await expect(html).not.toHaveAttribute('data-theme', /.*/)
  await expect(page.getByRole('button', { name: 'Tema: Perangkat' })).toBeVisible()
  expect(await simpan()).toBeNull()
  await page.reload()
  await expect(html).not.toHaveAttribute('data-theme', /.*/)
  await expect(page.getByRole('button', { name: 'Tema: Perangkat' })).toBeVisible()
})

test('pilihan Perangkat mengikuti perubahan skema warna perangkat', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const latar = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const terang = await latar()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(latar).not.toBe(terang)
})
