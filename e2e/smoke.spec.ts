import { expect, test } from '@playwright/test'

test('app loads and reaches the API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'CutiTerbang' })).toBeVisible()
  await expect(page.getByTestId('status-api')).toHaveText('API: ok')
})
