import { expect, test } from '@playwright/test';

test('shows login screen when no active session exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('طريقي').first()).toBeVisible();
  await expect(page.getByPlaceholder('name@example.com')).toBeVisible();
});

test('loads qa shell and supports dev navigation helpers', async ({ page }) => {
  await page.goto('/home?qa=1');
  await expect(page.getByText('الرئيسية').first()).toBeVisible();

  await page.evaluate(async () => {
    // @ts-ignore
    await window.taree2yDev.goWallet();
  });
  await expect(page.getByText('المحفظة').first()).toBeVisible();

  await page.evaluate(async () => {
    // @ts-ignore
    await window.taree2yDev.goBookings();
  });
  await expect(page.getByText('رحلاتي').first()).toBeVisible();
});

