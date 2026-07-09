# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.js >> Login Flow >> navigates to lobby after local login
- Location: e2e/login.spec.js:16:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="text"]')

```

# Page snapshot

```yaml
- main [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: DUEL SYSTEM
      - strong [ref=e8]: Login
    - generic [ref=e9]:
      - button "Login" [ref=e10] [cursor=pointer]
      - button "Registrar" [ref=e11] [cursor=pointer]
    - generic [ref=e12]:
      - generic [ref=e13]:
        - text: Usuario
        - textbox "Usuario" [ref=e14]
      - generic [ref=e15]:
        - text: Senha
        - textbox "Senha" [ref=e16]
      - button "Entrar" [ref=e17] [cursor=pointer]
      - button "Modo local" [ref=e18] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Login Flow', () => {
  4  |   test('login page loads and shows form', async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await expect(page.locator('.auth-brand strong')).toContainText('Login')
  7  |     await expect(page.locator('input')).toHaveCount(2)
  8  |   })
  9  | 
  10 |   test('local mode button exists', async ({ page }) => {
  11 |     await page.goto('/')
  12 |     const localBtn = page.getByText('Modo local')
  13 |     await expect(localBtn).toBeVisible()
  14 |   })
  15 | 
  16 |   test('navigates to lobby after local login', async ({ page }) => {
  17 |     await page.goto('/')
> 18 |     await page.fill('input[type="text"]', 'TestPlayer')
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  19 |     await page.click('button[type="submit"]')
  20 |     await expect(page).toHaveURL(/\/lobby/)
  21 |   })
  22 | })
```