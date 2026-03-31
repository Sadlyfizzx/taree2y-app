import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicWalletTopUpView from './PublicWalletTopUpView';

describe('PublicWalletTopUpView smoke', () => {
  it('shows invalid-link state when no request id exists', () => {
    window.history.replaceState({}, '', '/wallet-topup');
    render(<PublicWalletTopUpView />);
    expect(screen.getByText('رابط الشحن غير صالح أو ناقص. اطلب رابط جديد من داخل التطبيق.')).toBeTruthy();
  });
});
