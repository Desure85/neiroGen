import { test, expect, Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@demo.local'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'password'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  const form = page.locator('form')
  await form.getByRole('textbox', { name: 'you@example.com' }).fill(ADMIN_EMAIL)
  await form.getByRole('textbox', { name: '••••••••' }).fill(ADMIN_PASS)
  await form.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/therapist/) // дождаться редиректа после входа
}

async function openExerciseTypesList(page: Page) {
  await page.goto('/admin/exercise-types')
  await expect(page.getByRole('heading', { name: 'Типы упражнений' })).toBeVisible()
  await expect(page.locator('tbody tr')).not.toHaveCount(0)
}

test.describe.serial('Admin exercise types', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('toggle exercise type visibility from list', async ({ page }) => {
    await openExerciseTypesList(page)

    const firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toBeVisible()

    const toggleButton = firstRow.locator('button').filter({ hasText: /Скрыть|Показать/ }).first()
    const initialLabel = await toggleButton.innerText()

    await toggleButton.click()

    const toast = page.locator('[role="status"], [role="alert"]')
    await expect(toast).toContainText(/Тип (активирован|скрыт)/)

    const expectedLabelAfterToggle = initialLabel.includes('Скрыть') ? 'Показать' : 'Скрыть'
    await expect(firstRow.locator('button', { hasText: expectedLabelAfterToggle })).toBeVisible()

    await firstRow.locator('button', { hasText: expectedLabelAfterToggle }).click()
    await expect(toast).toContainText(/Тип (активирован|скрыт)/)
    await expect(firstRow.locator('button', { hasText: initialLabel })).toBeVisible()
  })

  test('edit exercise type details', async ({ page }) => {
    await openExerciseTypesList(page)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('a', { hasText: 'Открыть' }).click()
    await page.waitForURL('**/admin/exercise-types/*')

    const descriptionField = page.getByLabel('Описание')
    const originalDescription = await descriptionField.inputValue()
    const updatedDescription = `${originalDescription} (e2e)`

    await descriptionField.fill(updatedDescription)
    await page.getByRole('button', { name: 'Сохранить изменения' }).click()

    const toast = page.locator('[role="status"], [role="alert"]')
    await expect(toast).toContainText('Изменения сохранены')

    await expect(descriptionField).toHaveValue(updatedDescription)

    await descriptionField.fill(originalDescription)
    await page.getByRole('button', { name: 'Сохранить изменения' }).click()
    await expect(toast).toContainText('Изменения сохранены')
    await expect(descriptionField).toHaveValue(originalDescription)
  })

  test('add and remove custom field', async ({ page }) => {
    await openExerciseTypesList(page)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('a', { hasText: 'Открыть' }).click()
    await page.waitForURL('**/admin/exercise-types/*')

    const suffix = Date.now()
    const fieldLabel = `Поле e2e ${suffix}`
    const fieldKey = `e2e_field_${suffix}`

    await page.getByLabel('Заголовок поля').fill(fieldLabel)
    await page.getByLabel('Ключ').fill(fieldKey)
    await page.getByLabel('Тип').selectOption('string')
    await page.getByRole('button', { name: 'Добавить поле' }).click()

    const toast = page.locator('[role="status"], [role="alert"]')
    await expect(toast).toContainText('Поле добавлено')

    const newFieldRow = page.locator('tbody tr').filter({ hasText: fieldLabel }).first()
    await expect(newFieldRow).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await newFieldRow.getByRole('button', { name: 'Удалить' }).click()
    await expect(toast).toContainText('Поле удалено')
    await expect(page.locator('tbody tr').filter({ hasText: fieldLabel })).toHaveCount(0)
  })
})
