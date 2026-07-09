import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.auth-brand strong')).toContainText('Login')
    await expect(page.locator('input')).toHaveCount(2)
  })

  test('local mode button exists', async ({ page }) => {
    await page.goto('/')
    const localBtn = page.getByText('Modo local')
    await expect(localBtn).toBeVisible()
  })
})