import { test, expect } from '@playwright/test'

test.describe('Local Duel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('text=Modo local')
    await expect(page).toHaveURL(/\/lobby/)
  })

  test('local duel button exists in lobby', async ({ page }) => {
    await expect(page.getByText('Duelo local')).toBeVisible()
  })

  test('starts local duel from lobby', async ({ page }) => {
    await page.click('text=Duelo local')
    await page.waitForURL(/\/duel\/local/)
  })

  test('duel field renders with all elements', async ({ page }) => {
    await page.click('text=Duelo local')
    await page.waitForURL(/\/duel\/local/)
    await expect(page.locator('.duel-field')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.hud')).toBeVisible()
  })
})