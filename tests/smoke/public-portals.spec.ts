import { expect, test } from '@playwright/test';

test('wallet topup route shows invalid-link state without request id', async ({ page }) => {
  await page.goto('/wallet-topup');
  await expect(page.getByText('رابط الشحن غير صالح أو ناقص')).toBeVisible();
});

test('public trip route shows error state for invalid token', async ({ page }) => {
  await page.goto('/trip/invalid-token');
  await expect(page.getByText('تعذر فتح الرابط')).toBeVisible();
});

