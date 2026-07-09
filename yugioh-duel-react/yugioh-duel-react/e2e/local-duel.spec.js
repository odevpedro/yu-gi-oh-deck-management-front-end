import { test, expect } from '@playwright/test'

test.describe('Local Duel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.fill('input[placeholder]', 'TestPlayer')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/lobby/)
  })

  test('local duel button exists in lobby', async ({ page }) => {
    await expect(page.getByText('Duelo local')).toBeVisible()
  })

  test('starts local duel from lobby', async ({ page }) => {
    await page.click('text=Duelo local')
    await expect(page).toHaveURL(/\/duel\/local/)
  })

  test('duel field renders with all elements', async ({ page }) => {
    await page.click('text=Duelo local')
    await expect(page.locator('.duel-field')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.hud')).toBeVisible()
    await expect(page.locator('#playerHand')).toBeVisible()
    await expect(page.locator('.field-side--opponent')).toBeVisible()
    await expect(page.locator('.field-side--player')).toBeVisible()
  })

  test('can concede duel', async ({ page }) => {
    await page.click('text=Duelo local')
    await page.locator('.duel-field').waitFor({ timeout: 5000 })
    await page.click('text=CONCEDER')
    await expect(page.getByText('Tem certeza que deseja conceder?')).toBeVisible()
    await page.click('text=CONCEDER')
    await expect(page.getByText('DERROTA')).toBeVisible()
  })

  test('can return to lobby after duel', async ({ page }) => {
    await page.click('text=Duelo local')
    await page.locator('.duel-field').waitFor({ timeout: 5000 })
    await page.click('text=CONCEDER')
    await page.click('text=CONCEDER')
    await expect(page.getByText('VOLTAR AO LOBBY')).toBeVisible()
    await page.click('text=VOLTAR AO LOBBY')
    await expect(page).toHaveURL(/\/lobby/)
  })

  test('theme toggle works', async ({ page }) => {
    await page.click('text=Duelo local')
    await page.locator('.duel-field').waitFor({ timeout: 5000 })
    const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('light-theme'))
    await page.click('text=CLARO')
    const afterClick = await page.evaluate(() => document.documentElement.classList.contains('light-theme'))
    expect(afterClick).toBe(!initialTheme)
  })
})