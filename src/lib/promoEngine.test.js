import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('./logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
  normalizeSupabaseError: (error) => ({
    message: error?.message || String(error || ''),
    code: error?.code || null,
    status: error?.status || null,
    details: error?.details || null,
    hint: error?.hint || null,
  }),
  isMissingRpcError: (error, expectedFunctionName = '') => {
    const payload = JSON.stringify({
      code: error?.code || null,
      message: error?.message || String(error || ''),
      details: error?.details || null,
      hint: error?.hint || null,
    }).toLowerCase();
    const expected = String(expectedFunctionName || '').trim().toLowerCase();
    const matchesExpected = expected ? payload.includes(expected) : true;

    return (
      payload.includes('pgrst202') ||
      payload.includes('could not find the function') ||
      payload.includes('schema cache') ||
      (payload.includes('function') &&
        payload.includes('not found') &&
        matchesExpected)
    );
  },
}));

import { supabase } from './supabase';
import { getPromoPopupOffer, validatePromoCode } from './promoEngine';

function buildPromoPayload(overrides = {}) {
  return {
    ok: true,
    code: 'promo_valid',
    message: 'تم تفعيل الكود بنجاح.',
    applied: true,
    promo_code: 'AHLAN50',
    promoCode: 'AHLAN50',
    title: 'خصم أول رحلة',
    description: 'خصم ترحيبي',
    discount_amount: 50,
    discountAmount: 50,
    discount_type: 'percent',
    discountType: 'percent',
    discount_value: 50,
    discountValue: 50,
    popup_enabled: true,
    popupEnabled: true,
    highlight_enabled: true,
    highlightEnabled: true,
    data: {
      applied: true,
      promo_code: 'AHLAN50',
      promoCode: 'AHLAN50',
      title: 'خصم أول رحلة',
      description: 'خصم ترحيبي',
      discount_amount: 50,
      discountAmount: 50,
      discount_type: 'percent',
      discountType: 'percent',
      discount_value: 50,
      discountValue: 50,
      popup_enabled: true,
      popupEnabled: true,
      highlight_enabled: true,
      highlightEnabled: true,
    },
    ...overrides,
  };
}

describe('promoEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes a successful promo preview response', async () => {
    supabase.rpc.mockResolvedValue({
      data: buildPromoPayload(),
      error: null,
    });

    const result = await validatePromoCode({
      userId: 'user-1',
      code: 'ahlan50',
      bookingAmount: 200,
      tripMeta: { from: 'القاهرة', to: 'الإسكندرية' },
    });

    const data = result.data || result;

    expect(result.ok).toBe(true);
    expect(String(result.code || '')).toBe('promo_valid');
    expect(Boolean(data.applied)).toBe(true);
    expect(data.promoCode || data.promo_code || result.promoCode).toBe('AHLAN50');
    expect(Number(data.discountAmount || data.discount_amount || 0)).toBe(50);
    expect(supabase.rpc).toHaveBeenCalled();
  });

  it('returns a safe failure when preview RPC is missing', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.preview_app_promo',
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.validate_app_promo_code',
        },
      });

    const result = await validatePromoCode({
      userId: 'user-1',
      code: 'ahlan50',
      bookingAmount: 200,
      tripMeta: {},
    });

    expect(result.ok).toBe(false);
    expect(String(result.code || '')).not.toBe('promo_valid');
    expect(String(result.message || '')).not.toHaveLength(0);
  });

  it('returns a safe failure for unexpected RPC errors', async () => {
    supabase.rpc.mockRejectedValue(new Error('network boom'));

    const result = await validatePromoCode({
      userId: 'user-1',
      code: 'ahlan50',
      bookingAmount: 200,
      tripMeta: {},
    });

    expect(result.ok).toBe(false);
    expect(String(result.message || '')).not.toHaveLength(0);
  });

  it('normalizes popup offer responses and returns null on missing RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: buildPromoPayload({
        code: 'AHLAN50',
        title: 'عرض مناسب ليك',
        message: 'جرّب العرض دلوقتي',
      }),
      error: null,
    });

    const offer = await getPromoPopupOffer({ userId: 'user-1' });
    expect(offer).not.toBeNull();
    expect(offer.code).toBe('AHLAN50');

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.get_promo_popup_offer',
      },
    });

    const missing = await getPromoPopupOffer({ userId: 'user-1' });
    expect(missing).toBeNull();
  });
});
