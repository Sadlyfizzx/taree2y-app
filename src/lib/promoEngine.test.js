import { describe, expect, it } from 'vitest';
import * as promoEngine from './promoEngine';

describe('promoEngine exports', () => {
  it('exposes core promo helpers without crashing the module', () => {
    expect(typeof promoEngine).toBe('object');
    expect(typeof promoEngine.validatePromoCode).toBe('function');
    expect(typeof promoEngine.getPromoPopupOffer).toBe('function');
  });
});
