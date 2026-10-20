import { test, expect } from '@playwright/test'

test('startup screen is calm and uses the saved interface language', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('CareSphere.interfaceLanguage', 'vi'))
  await page.route('**/src/main.jsx*', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export {}' }))
  await page.goto('/')
  await expect(page.getByRole('status', { name: 'Đang tải… CareSphere' })).toBeVisible()
  await expect(page.locator('#root')).toHaveAttribute('aria-busy', 'true')
})

test('header uses the CareSphere mark and clears its busy state after startup', async ({ page }) => {
  await page.goto('/')
  const brand = page.getByRole('button', { name: 'Go to Overview' })
  await expect(brand.locator('img')).toHaveAttribute('src', '/care-icon.svg')
  await expect(brand.locator('img')).toHaveAttribute('alt', '')
  await expect(page.locator('#root')).not.toHaveAttribute('aria-busy', 'true')
})

test('home dashboard opens visit preparation directly', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Prepare visit brief', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[aria-live="polite"]')).toHaveText('0')
  await expect(dialog.getByRole('button', { name: 'Create PDF' })).toBeDisabled()
})

test('settings show platform versions and the release date', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings and accessibility' }).click()
  const settings = page.getByRole('dialog')
  await expect(settings.getByRole('heading', { name: 'Version information' })).toBeVisible()
  await expect(settings.getByText('1.5.1', { exact: true })).toBeVisible()
  await expect(settings.getByText('3.8.0 (17)', { exact: true })).toBeVisible()
  await expect(settings.getByText('1.9.0 (11)', { exact: true })).toBeVisible()
  await expect(settings.locator('time[datetime="2026-10-19"]')).toBeVisible()
})
