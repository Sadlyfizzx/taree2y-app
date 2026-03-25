import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const portalMocks = vi.hoisted(() => ({
  buildWalletTopupClientId: vi.fn(),
  markWalletTopupPaid: vi.fn(),
  publicTopupWallet: vi.fn(),
  readWalletTopupPaidState: vi.fn(),
}));

vi.mock('./publicPortal', () => ({
  ...portalMocks,
}));

import PublicWalletTopUpView from './PublicWalletTopUpView';

describe('PublicWalletTopUpView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portalMocks.buildWalletTopupClientId.mockImplementation((requestId) => `topup-${requestId}`);
    portalMocks.readWalletTopupPaidState.mockReturnValue(null);
    window.history.replaceState({}, '', '/wallet-topup?uid=user_1&amount=100&fee=3&credit=97&req=req_1');
    window.close = vi.fn();
  });

  it('shows the already-paid state without re-confirming', async () => {
    portalMocks.readWalletTopupPaidState.mockReturnValueOnce({ paid: true });

    render(<PublicWalletTopUpView />);

    expect(
      await screen.findByText(/تم دفع العملية دي بالفعل قبل كده/i),
    ).toBeTruthy();

    expect(screen.getByRole('button', { name: /تم الدفع بالفعل/i })).toBeDisabled();
    expect(portalMocks.publicTopupWallet).not.toHaveBeenCalled();
  });

  it('confirms the wallet top-up and marks it as paid', async () => {
    const user = userEvent.setup();
    portalMocks.publicTopupWallet.mockResolvedValue({ ok: true });

    render(<PublicWalletTopUpView />);

    await user.click(screen.getByRole('button', { name: /تأكيد الشحن/i }));

    await waitFor(() => {
      expect(portalMocks.publicTopupWallet).toHaveBeenCalledWith({
        userId: 'user_1',
        amount: 97,
        requestId: 'req_1',
        paymentChannel: 'public_qr_net',
        clientId: 'topup-req_1',
      });
    });

    expect(portalMocks.markWalletTopupPaid).toHaveBeenCalledWith(
      'req_1',
      expect.objectContaining({
        userId: 'user_1',
        grossAmount: 100,
        creditAmount: 97,
        feeAmount: 3,
        clientId: 'topup-req_1',
      }),
    );

    expect(
      await screen.findByText(/تم تأكيد الشحن بنجاح/i),
    ).toBeTruthy();
  });
});
