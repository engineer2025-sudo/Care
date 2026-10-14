import { test, expect } from '@playwright/test'

const navButton = (page, name) => page.getByRole('navigation').filter({ visible: true }).getByRole('button', { name, exact: true })
const expectNoOverflow = async page => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

// These checks stay local: no calls, device pairing, or notification permission.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
})

test('dashboard shortcuts reach the right task and move keyboard focus', async ({ page }) => {
  await page.getByRole('button', { name: 'View my routine' }).click()
  await expect(page.getByRole('region', { name: 'My daily routine' })).toBeFocused()
  await page.getByRole('button', { name: 'Customize', exact: true }).click()
  await page.getByRole('textbox', { name: 'Add a personal routine' }).fill('Morning hydration')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const routine = page.getByRole('button', { name: /^Morning hydration/ })
  await routine.click()
  await expect(routine).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Daily routine 1/ })).toBeVisible()
  await page.getByRole('button', { name: /Heart rate Not connected/ }).click()
  await expect(page.getByRole('main')).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Wearable Vitals & Telehealth' })).toBeVisible()
})

test('mood options have visible labels and an announced saved state', async ({ page }) => {
  const mood = page.getByRole('button', { name: 'Feeling Good', exact: true })
  await expect(mood).toHaveText('Good')
  await mood.click()
  await expect(mood).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: 'Saved for today: good.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Feeling Good', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('settings retain typing focus, trap Tab, close with Escape, and restore focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Settings and accessibility' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeFocused()
  const name = page.getByRole('textbox', { name: 'Display name' })
  await name.fill('')
  await name.pressSequentially('Jamie')
  await expect(name).toHaveValue('Jamie')
  await expect(name).toBeFocused()
  const close = page.getByRole('button', { name: 'Close settings' })
  await close.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button').last()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('heading', { name: /Jamie/ })).toBeVisible()
})

test('medication setup has a direct route, labeled inputs, and time validation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = page.getByRole('button', { name: 'Add a medication', exact: true })
  await trigger.click()
  await expect(page.getByRole('heading', { name: 'Medication schedule · local only' })).toBeFocused()
  await page.getByLabel('Medication name', { exact: true }).fill('Example medication')
  await page.getByLabel('Reminder time', { exact: true }).fill('')
  await expect(page.getByRole('button', { name: 'Add medication', exact: true })).toBeDisabled()
  await page.getByLabel('Reminder time', { exact: true }).fill('09:30')
  await page.getByRole('button', { name: 'Add medication', exact: true }).click()
  await expect(page.getByText('Example medication · 9:30 AM')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Confirm medication schedule' })).not.toBeChecked()
  await expectNoOverflow(page)
  await page.getByRole('button', { name: 'Close settings' }).click()
  // The empty-state trigger disappears once a medication exists.
  await expect(page.getByRole('region', { name: "Today's medications" })).toBeFocused()
})

test('care notes show a useful empty state and only save non-empty text', async ({ page }) => {
  await navButton(page, 'Care Circle').click()
  await expect(page.getByText(/No care notes yet/)).toBeVisible()
  await expect(page.getByText(/Sample roster|Sarah M\.|Evelyn Vance/)).toHaveCount(0)
  const save = page.getByRole('button', { name: 'Save', exact: true })
  await expect(save).toBeDisabled()
  await page.getByRole('textbox', { name: 'New care note' }).fill('Ask about the next appointment.')
  await save.click()
  await expect(page.getByText('Ask about the next appointment.')).toBeVisible()
})

for (const width of [320, 390, 768, 1280, 1440]) {
  test(`all sections fit at ${width}px, including largest text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const scale of ['md', 'xl']) {
      if (scale === 'xl') {
        await page.getByRole('button', { name: 'Settings and accessibility' }).click()
        await page.getByRole('button', { name: 'A++', exact: true }).click()
        await page.keyboard.press('Escape')
      }
      for (const section of ['Overview', 'Activities', 'Coffee Circles', 'Care Circle', 'Vitals & Telehealth']) {
        await navButton(page, section).click()
        await expectNoOverflow(page)
        await expect(navButton(page, section)).toHaveAttribute('aria-current', 'page')
      }
    }
  })
}

test('dark and high-contrast appearances preserve usable navigation', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings and accessibility' }).click()
  await page.getByLabel('Color appearance').selectOption('dark')
  await page.getByRole('switch', { name: 'High contrast', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
  await expectNoOverflow(page)
  await navButton(page, 'Activities').click()
  await expect(page.getByRole('heading', { name: 'Activities & Sensory Tools' })).toBeVisible()
})

test('visit brief choices retain focus and dialogs fit small screens with large text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 })
  await page.getByRole('button', { name: 'Settings and accessibility' }).click()
  await page.getByRole('button', { name: 'A++', exact: true }).click()
  let dialog = page.getByRole('dialog')
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.keyboard.press('Escape')
  await navButton(page, 'Care Circle').click()
  await page.getByRole('button', { name: 'Prepare visit brief' }).click()
  const choice = page.getByRole('checkbox', { name: /Display name/ })
  await choice.check()
  await expect(choice).toBeFocused()
  dialog = page.getByRole('dialog')
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'SOS', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeFocused()
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'SOS', exact: true })).toBeFocused()
})


test('health has no generated reading controls or demo exports', async ({ page }) => {
  await navButton(page, 'Vitals & Telehealth').click()
  await expect(page.getByRole('button', { name: /demo|simulated|generate example/i })).toHaveCount(0)
  await expect(page.getByText('Other health readings', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pair real monitor' }).click()
  await expect(page.getByText(/Web Bluetooth is unavailable here/)).toBeVisible()
})
