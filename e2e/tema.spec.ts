import { expect, test } from '@playwright/test'

test('tombol tema mengatur data-theme di <html> dan bertahan setelah dimuat ulang', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const html = page.locator('html')
  await expect(html).not.toHaveAttribute('data-theme', /.*/)

  await page.getByRole('button', { name: 'Mode gelap' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Mode terang' })).toBeVisible()

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Mode terang' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'light')
})
