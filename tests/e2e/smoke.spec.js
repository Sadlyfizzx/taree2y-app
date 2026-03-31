import { test, expect } from '@playwright/test';

async function waitForQaApi(page) {
  await page.waitForFunction(
    () => typeof window !== 'undefined' && window.taree2yDev && typeof window.taree2yDev.snapshot === 'function',
    { timeout: 20000 },
  );
}

test.describe('Taree2y pass 3 smoke', () => {
  test('QA shell boots and exposes dev harness', async ({ page }) => {
    await page.goto('/home?qa=1');
    await waitForQaApi(page);

    const snapshot = await page.evaluate(() => window.taree2yDev.snapshot());
    expect(snapshot.activePage).toBe('home');
    expect(snapshot.activeView).toBe('main');
    await expect(page.getByRole('button', { name: /طريقي\s+رحلات مصر بشكل أوضح/i })).toBeVisible();
  });

  test('QA navigation smoke covers main tabs', async ({ page }) => {
    await page.goto('/home?qa=1');
    await waitForQaApi(page);

    const state = await page.evaluate(async () => {
      const api = window.taree2yDev;
      await api.goWallet();
      const wallet = api.snapshot();
      await api.goBookings();
      const bookings = api.snapshot();
      await api.goTickets();
      const tickets = api.snapshot();
      return { wallet, bookings, tickets };
    });

    expect(state.wallet.activePage).toBe('wallet');
    expect(state.bookings.activePage).toBe('bookings');
    expect(state.tickets.activePage).toBe('tickets');
  });

  test('QA booking smoke reaches invoice safely', async ({ page }) => {
    await page.goto('/home?qa=1');
    await waitForQaApi(page);

    const result = await page.evaluate(async () => {
      const api = window.taree2yDev;
      await api.goHome();
      const searchResults = await api.search({
        from: 'القاهرة',
        to: 'الإسكندرية',
        passengers: 1,
      });

      if (!Array.isArray(searchResults?.trips) || searchResults.trips.length === 0) {
        return { ok: false, stage: 'search_empty', searchResults };
      }

      const trip = await api.openTrip(0);
      const seats = await api.selectFirstAvailableSeats(1);
      const checkout = await api.goCheckout();
      const afterBooking = await api.completeBooking();

      return {
        ok: true,
        trip,
        seats,
        checkout,
        afterBooking,
      };
    });

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.seats)).toBe(true);
    expect(result.seats.length).toBe(1);
    expect(result.checkout.activeView).toBe('checkout');
    expect(result.afterBooking.activeView).toBe('invoice');
    expect(result.afterBooking.currentInvoice).toBeTruthy();
    expect(result.afterBooking.viewedTicket).toBeTruthy();
    await expect(page.getByText('تم تأكيد الحجز')).toBeVisible();
  });

  test('public wallet top-up invalid route fails gracefully', async ({ page }) => {
    await page.goto('/wallet-topup');
    await expect(page.getByText('رابط الشحن غير صالح أو ناقص.')).toBeVisible();
  });

  test('public trip tracking invalid token fails gracefully', async ({ page }) => {
    await page.goto('/trip/qa-invalid-token');
    await expect(page.getByText('تعذر فتح الرابط')).toBeVisible();
  });
});
