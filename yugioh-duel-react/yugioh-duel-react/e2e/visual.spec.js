import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('login page has correct layout', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('.auth-shell')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
  })

  test('not found page shows 404', async ({ page }) => {
    await page.goto('/nonexistent')
    await expect(page.locator('text=404')).toBeVisible()
  })
})