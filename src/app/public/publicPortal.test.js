import { describe, expect, it } from 'vitest';
import {
  buildWalletTopupUrl,
  calculateWalletTopupBreakdown,
  getPublicTripTokenFromPath,
  isPublicPortalPath,
} from './publicPortal';

describe('publicPortal utilities', () => {
  it('calculates a wallet top-up breakdown with minimum fee protection', () => {
    expect(calculateWalletTopupBreakdown(100)).toEqual({
      grossAmount: 100,
      feeAmount: 3,
      netAmount: 97,
    });
  });

  it('builds a wallet top-up url with stable params', () => {
    const url = buildWalletTopupUrl({
      userId: 'user_123',
      amount: 200,
      requestId: 'TOP-REQ-1',
    });

    expect(url).toContain('/wallet-topup?');
    expect(url).toContain('uid=user_123');
    expect(url).toContain('amount=200');
    expect(url).toContain('fee=5');
    expect(url).toContain('credit=195');
    expect(url).toContain('req=TOP-REQ-1');
  });

  it('detects supported public portal paths', () => {
    expect(isPublicPortalPath('/trip/abc')).toBe(true);
    expect(isPublicPortalPath('/t/abc')).toBe(true);
    expect(isPublicPortalPath('/wallet-topup?uid=1')).toBe(true);
    expect(isPublicPortalPath('/profile')).toBe(false);
  });

  it('extracts trip tokens from both public tracking routes', () => {
    expect(getPublicTripTokenFromPath('/trip/abc123')).toBe('abc123');
    expect(getPublicTripTokenFromPath('/t/xyz789')).toBe('xyz789');
    expect(getPublicTripTokenFromPath('/wallet-topup')).toBe('');
  });
});
