import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/promoEngine', () => ({
  validatePromoCode: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { validatePromoCode } from '../../lib/promoEngine';
import CheckoutView from './CheckoutView';

function makePromoResponse({
  applied = true,
  promoCode = 'AHLAN50',
  discountAmount = 50,
  resultCode = 'promo_valid',
  message = 'تم تفعيل الكود بنجاح.',
} = {}) {
  return {
    ok: applied,
    code: resultCode,
    message,
    applied,
    promoCode,
    promo_code: promoCode,
    title: 'خصم ترحيبي',
    description: 'خصم صالح للحجز الحالي',
    discountAmount,
    discount_amount: discountAmount,
    discountType: 'fixed',
    discount_type: 'fixed',
    data: {
      applied,
      promoCode,
      promo_code: promoCode,
      title: 'خصم ترحيبي',
      description: 'خصم صالح للحجز الحالي',
      discountAmount,
      discount_amount: discountAmount,
      discountType: 'fixed',
      discount_type: 'fixed',
    },
  };
}

const baseTrip = {
  instanceId: 'trip-instance-1',
  id: 'trip-1',
  from: 'القاهرة',
  to: 'الإسكندرية',
  fromStationName: 'محطة القاهرة الرئيسية',
  toStationName: 'محطة الإسكندرية الرئيسية',
  date: '2026-04-10',
  departureTime: '10:00',
  arrivalTime: '13:00',
  durationHour: 3,
  price: 200,
  company: 'جو باص',
  class: 'اقتصادي مميز',
  status: 'upcoming',
  holdExpiresAt: null,
};

function buildProps(overrides = {}) {
  return {
    userId: 'user-1',
    trip: { ...baseTrip, ...(overrides.trip || {}) },
    seats: ['1A'],
    passengers: 1,
    wallet: 500,
    subscription: 'none',
    onCreateBooking:
      overrides.onCreateBooking ||
      vi.fn().mockResolvedValue({
        ok: true,
        booking: {
          bookingId: 'b-1',
          pnr: 'PNR-1',
          from: 'القاهرة',
          to: 'الإسكندرية',
          date: '2026-04-10',
          departureTime: '10:00',
          arrivalTime: '13:00',
          status: 'upcoming',
        },
        invoice: {
          items: [],
          total: 150,
        },
      }),
    onSuccess: overrides.onSuccess || vi.fn(),
    showToast: overrides.showToast || vi.fn(),
    openModal: overrides.openModal || vi.fn(),
    ...overrides,
  };
}

describe('CheckoutView booking QA pass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('revalidates promo on final confirm and submits the validated code', async () => {
    validatePromoCode
      .mockResolvedValueOnce(makePromoResponse({ promoCode: 'AHLAN50', discountAmount: 50 }))
      .mockResolvedValueOnce(makePromoResponse({ promoCode: 'AHLAN50', discountAmount: 50 }));

    const props = buildProps();
    const user = userEvent.setup();

    render(<CheckoutView {...props} />);

    await user.type(screen.getByPlaceholderText('اكتب الكود لو عندك'), 'AHLAN50');
    await user.click(screen.getByRole('button', { name: 'تفعيل الكود' }));

    await waitFor(() => {
      expect(validatePromoCode).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: 'ادفع وأكد الحجز' }));

    await waitFor(() => {
      expect(validatePromoCode).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(props.onCreateBooking).toHaveBeenCalledTimes(1);
    });

    expect(props.onCreateBooking.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        promoCode: 'AHLAN50',
      }),
    );

    await waitFor(() => {
      expect(props.onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('stops booking when promo fails during final revalidation', async () => {
    validatePromoCode
      .mockResolvedValueOnce(makePromoResponse({ promoCode: 'AHLAN50', discountAmount: 50 }))
      .mockResolvedValueOnce(
        makePromoResponse({
          applied: false,
          resultCode: 'promo_expired',
          message: 'مدة استخدام الكود انتهت.',
          discountAmount: 0,
        }),
      );

    const props = buildProps();
    const user = userEvent.setup();

    render(<CheckoutView {...props} />);

    await user.type(screen.getByPlaceholderText('اكتب الكود لو عندك'), 'AHLAN50');
    await user.click(screen.getByRole('button', { name: 'تفعيل الكود' }));
    await waitFor(() => expect(validatePromoCode).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'ادفع وأكد الحجز' }));

    await waitFor(() => {
      expect(validatePromoCode).toHaveBeenCalledTimes(2);
    });

    expect(props.onCreateBooking).not.toHaveBeenCalled();

    const messages = props.showToast.mock.calls.map(([msg]) => String(msg)).join(' | ');
    expect(messages).toMatch(/انتهت|الكود|الخصم/);
  });

  it('blocks final booking if wallet becomes insufficient after final promo revalidation', async () => {
    validatePromoCode
      .mockResolvedValueOnce(makePromoResponse({ promoCode: 'AHLAN50', discountAmount: 50 }))
      .mockResolvedValueOnce(makePromoResponse({ promoCode: 'AHLAN50', discountAmount: 20 }));

    const props = buildProps({ wallet: 160 });
    const user = userEvent.setup();

    render(<CheckoutView {...props} />);

    await user.type(screen.getByPlaceholderText('اكتب الكود لو عندك'), 'AHLAN50');
    await user.click(screen.getByRole('button', { name: 'تفعيل الكود' }));
    await waitFor(() => expect(validatePromoCode).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'ادفع وأكد الحجز' }));

    await waitFor(() => {
      expect(validatePromoCode).toHaveBeenCalledTimes(2);
    });

    expect(props.onCreateBooking).not.toHaveBeenCalled();

    const messages = props.showToast.mock.calls.map(([msg]) => String(msg)).join(' | ');
    expect(messages).toMatch(/رصيد|المحفظة/);
  });

  it('blocks submit when the seat hold is already expired', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T12:00:00.000Z'));

    const props = buildProps({
      trip: {
        ...baseTrip,
        holdExpiresAt: '2026-03-25T11:59:00.000Z',
      },
    });

    render(<CheckoutView {...props} />);

    const submitButton = screen.getByRole('button', { name: /ادفع وأكد الحجز/i });
    expect(submitButton).toBeDisabled();

    expect(screen.getByText(/مهلة تثبيت المقاعد انتهت/i)).toBeTruthy();
    expect(
      screen.getByText(/ارجع خطوة للمقاعد وثبّت اختيارك تاني قبل الدفع/i),
    ).toBeTruthy();

    expect(props.onCreateBooking).not.toHaveBeenCalled();
    expect(props.showToast).not.toHaveBeenCalled();
  });
});
