import { describe, expect, it, vi } from 'vitest';
import {
  buildOverlapWarningKey,
  findOverlappingTrip,
  getRemainingHoldMs,
  getTripWindow,
  isTripActiveForOverlap,
} from './checkoutLogic';

describe('checkoutLogic', () => {
  it('returns null for empty hold expiry', () => {
    expect(getRemainingHoldMs('')).toBeNull();
  });

  it('clamps expired hold to zero', () => {
    expect(getRemainingHoldMs('2000-01-01T00:00:00.000Z')).toBe(0);
  });

  it('handles overnight trip windows', () => {
    const window = getTripWindow({ date: '2026-04-01', departureTime: '23:30', arrivalTime: '01:15' });
    expect(window.start.getDate()).not.toBe(window.end.getDate());
  });

  it('ignores cancelled and past trips for overlap', () => {
    expect(isTripActiveForOverlap({ status: 'cancelled' })).toBe(false);
    expect(isTripActiveForOverlap({ status: 'past' })).toBe(false);
  });

  it('finds overlapping upcoming trip windows', () => {
    const overlap = findOverlappingTrip(
      { date: '2026-04-01', departureTime: '10:00', arrivalTime: '12:00', status: 'upcoming' },
      [
        { bookingId: 'b1', date: '2026-04-01', departureTime: '11:00', arrivalTime: '13:00', status: 'upcoming' },
      ],
    );
    expect(overlap?.bookingId).toBe('b1');
  });

  it('builds deterministic overlap warning keys', () => {
    expect(buildOverlapWarningKey({ instanceId: 'a' }, { bookingId: 'b' })).toBe('a::b');
  });
});

