import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@demo.local'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'password'

test.describe('Auth', () => {
  test('login success -> redirects to /therapist and me is 200', async ({ page }) => {
    await page.goto('/login')
    const form = page.locator('form')
    await form.getByRole('textbox', { name: 'you@example.com' }).fill(ADMIN_EMAIL)
    await form.getByRole('textbox', { name: '••••••••' }).fill(ADMIN_PASS)
    await form.getByRole('button', { name: 'Войти' }).click()

    await expect(page).toHaveURL(/\/therapist/)

    // loader disappears
    const loader = page.getByText('Загружаем ваш профиль…')
    await expect(loader).toHaveCount(0, { timeout: 10000 })

    // session is alive
    const meOk = await page.evaluate(async () => {
      const r = await fetch('/api/auth/me', { credentials: 'include' })
      return r.ok
    })
    expect(meOk).toBeTruthy()
  })

  test('protected route without session -> redirect to /login', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/therapist')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('invalid password stays on /login', async ({ page }) => {
    await page.goto('/login')
    const form = page.locator('form')
    await form.getByRole('textbox', { name: 'you@example.com' }).fill('invalid@example.com')
    await form.getByRole('textbox', { name: '••••••••' }).fill('wrongpass')
    await form.getByRole('button', { name: 'Войти' }).click()
    // remain on login or get an error
    await expect(page).toHaveURL(/\/login/)
  })
})
