// Screenshot + axe-core checks of examples/index.html in each project
// (light, dark, narrow, rtl; see playwright.config.js).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function open(page, testInfo) {
  const query = testInfo.project.name === 'rtl' ? '?static&dir=rtl' : '?static';
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') { errors.push(msg.text()); } });
  await page.goto(`/${query}`);
  await page.locator('html[data-gallery-ready]').waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  return errors;
}

function report(violations) {
  return violations.map(v => `${v.id} (${v.impact}): ${v.help}\n`
    + v.nodes.slice(0, 15).map(n => `  ${n.target.join(' ')} — ${n.failureSummary.split('\n').slice(1).join(' ')}`).join('\n'))
    .join('\n');
}

test('gallery renders without errors and matches the screenshot', async ({ page }, testInfo) => {
  const errors = await open(page, testInfo);
  expect(errors, errors.join('\n')).toEqual([]);
  if (testInfo.project.name === 'rtl') {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  }
  if (testInfo.project.name === 'dark') {
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  }
  await expect(page).toHaveScreenshot('gallery.png', { fullPage: true });
});

test('gallery has no axe-core WCAG violations', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map(v => v.id), report(violations)).toEqual([]);
});

test('confirm dialog is accessible, traps focus and closes with Escape', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const opener = page.locator('#confirmBtn');
  await opener.click();
  const dialog = page.getByRole('alertdialog', { name: 'Remove Bedroom Fan?' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  const { violations } = await new AxeBuilder({ page }).include('.mp-dialog-backdrop').withTags(WCAG).analyze();
  expect(violations.map(v => v.id), report(violations)).toEqual([]);
  await expect(dialog).toHaveScreenshot('confirm-dialog.png');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.locator('#confirmResult')).toHaveText('Kept');
});

test('tabs and device cards work from the keyboard', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const devicesTab = page.getByRole('tab', { name: 'Devices' });
  await devicesTab.focus();
  await page.keyboard.press(testInfo.project.name === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
  const settingsTab = page.getByRole('tab', { name: 'Settings' });
  await expect(settingsTab).toBeFocused();
  await expect(settingsTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#view-settings')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(devicesTab).toHaveAttribute('aria-selected', 'true');

  await page.locator('#deviceList .mp-device-card').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.mp-toast-container .mp-toast')).toContainText('Kitchen Lamp selected');
});

test('the Save bar, secret reveal and theme toggle respond', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const bar = page.getByRole('region', { name: 'Unsaved changes' });
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Discard' }).click();
  await expect(bar).toBeHidden();

  const token = page.getByLabel('API token', { exact: true });
  await expect(token).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show API token' }).click();
  await expect(token).toHaveAttribute('type', 'text');

  const before = await page.locator('html').getAttribute('data-bs-theme');
  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-bs-theme', before);
});
