import { test, expect } from '@playwright/test'
test('first completed install can reopen saved notes and activities offline', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
  })
  const nav = page.getByRole('navigation').filter({ visible: true })
  await nav.getByRole('button', { name: 'Care Circle', exact: true }).click()
  await page.getByLabel('New care note', { exact: true }).fill('Available without a connection')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Available without a connection', { exact: true })).toBeVisible()
  // Let the queued encrypted write finish before replacing the document.
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('caresphere.v1') || '{}').ciphertext)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  await nav.getByRole('button', { name: 'Care Circle', exact: true }).click()
  await expect(page.getByText('Available without a connection', { exact: true })).toBeVisible()
  await nav.getByRole('button', { name: 'Activities', exact: true }).click()
  await page.getByRole('button', { name: 'Open Conversation cards' }).click()
  await expect(page.getByText('What music do you enjoy?', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next / skip' }).click()
  await expect(page.getByText('What makes a place feel comfortable to you?', { exact: true })).toBeVisible()
})
