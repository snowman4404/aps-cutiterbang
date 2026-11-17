import { expect, test } from '@playwright/test'

test('app loads and reaches the API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'CutiTerbang' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Selamat datang di CutiTerbang' })).toBeVisible()

  // Lewat proxy Vite, seperti yang dipakai aplikasi web.
  const res = await page.request.get('/api/health')
  expect(res.ok()).toBe(true)
  expect(await res.json()).toMatchObject({ ok: true })
})
