import { test, expect } from '@playwright/test'

test('home dashboard opens visit preparation directly', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Prepare visit brief', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Selected sections')).toBeVisible()
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
