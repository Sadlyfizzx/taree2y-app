import { expect, test } from '@playwright/test';

test('qa smoke covers search to invoice to ticket', async ({ page }) => {
  await page.goto('/home?qa=1');

  await page.evaluate(async () => {
    // @ts-ignore
    await window.taree2yDev.search({ from: 'القاهرة', to: 'الإسكندرية', passengers: 1 });
    // @ts-ignore
    await window.taree2yDev.openTrip(0);
    // @ts-ignore
    await window.taree2yDev.selectFirstAvailableSeats(1);
    // @ts-ignore
    await window.taree2yDev.goCheckout();
  });

  await expect(page.getByText('راجع الدفع وأكد الحجز')).toBeVisible();
  await page.getByRole('button', { name: 'ادفع وأكد الحجز' }).click();
  await expect(page.getByText('تم تأكيد الحجز')).toBeVisible();
  await page.getByRole('button', { name: 'افتح التذكرة' }).click();
  await expect(page.getByText('التذكرة').first()).toBeVisible();
});

