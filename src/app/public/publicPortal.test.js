import { describe, expect, it } from 'vitest';
import * as publicPortal from './publicPortal';

describe('publicPortal exports', () => {
  it('exposes public portal helpers', () => {
    expect(typeof publicPortal.isPublicPortalPath).toBe('function');
    expect(typeof publicPortal.getPublicTripTokenFromPath).toBe('function');
    expect(typeof publicPortal.buildWalletTopupClientId).toBe('function');
  });
});
