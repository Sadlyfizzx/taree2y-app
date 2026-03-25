import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const portalMocks = vi.hoisted(() => ({
  buildWalletTopupUrl: vi.fn(),
  copyTextWithFallback: vi.fn(),
  createPublicTripShare: vi.fn(),
  createWalletRequestId: vi.fn(),
}));

vi.mock('../../public/publicPortal', () => ({
  ...portalMocks,
}));

import InternalOpsPanel from './InternalOpsPanel';

describe('InternalOpsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portalMocks.buildWalletTopupUrl.mockReturnValue('https://taree2y.test/wallet-topup?uid=user_1');
    portalMocks.copyTextWithFallback.mockResolvedValue(true);
    portalMocks.createPublicTripShare.mockResolvedValue({
      token: 'trip_token_1',
      url: 'https://taree2y.test/trip/trip_token_1',
    });
    portalMocks.createWalletRequestId.mockReturnValue('REQ-1');
    window.open = vi.fn();
  });

  it('refreshes state and can create a public tracking link for the latest trip', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn(async () => {});
    const showToast = vi.fn();

    render(
      <InternalOpsPanel
        closeModal={vi.fn()}
        userId="user_1"
        user={{ name: 'Ziad', email: 'ziad@example.com' }}
        wallet={250}
        points={120}
        subscription="vip"
        latestTrip={{
          bookingId: 'booking_1',
          pnr: 'PNR123',
          from: 'القاهرة',
          to: 'الإسكندرية',
          date: '2026-03-26',
          departureTime: '10:00',
          arrivalTime: '13:00',
          durationHour: 3,
          company: 'Go Bus',
          class: 'VIP',
          selectedSeats: ['1A'],
        }}
        onRefresh={onRefresh}
        onOpenLatestTicket={vi.fn()}
        onOpenLatestTracking={vi.fn()}
        showToast={showToast}
      />,
    );

    await user.click(screen.getByRole('button', { name: /تحديث الحالة الآن/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /أنشئ رابط تتبع عام/i }));
    await waitFor(() => {
      expect(portalMocks.createPublicTripShare).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking_1',
          pnr: 'PNR123',
          from: 'القاهرة',
          to: 'الإسكندرية',
        }),
      );
    });

    expect(portalMocks.copyTextWithFallback).toHaveBeenCalledWith(
      'https://taree2y.test/trip/trip_token_1',
      'رابط المتابعة',
    );
    expect(showToast).toHaveBeenCalled();
  });
});
