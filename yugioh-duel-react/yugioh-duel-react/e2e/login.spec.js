import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h2')).toContainText(/login|auth/i)
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('local mode button exists', async ({ page }) => {
    await page.goto('/')
    const localBtn = page.getByText(/modo local/i)
    await expect(localBtn).toBeVisible()
  })

  test('navigates to lobby after local login', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[placeholder]', 'TestPlayer')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/lobby/)
  })
})