import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CheckoutView from './CheckoutView';

function futureDate(days = 7) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function createTrip(overrides = {}) {
  return {
    instanceId: 'trip-001',
    bookingId: 'trip-001',
    from: 'القاهرة',
    to: 'الإسكندرية',
    fromStationName: 'محطة القاهرة',
    toStationName: 'محطة الإسكندرية',
    date: futureDate(),
    departureTime: '10:00',
    arrivalTime: '13:00',
    durationHour: 3,
    price: 150,
    company: 'جو باص',
    class: 'اقتصادي مميز',
    status: 'upcoming',
    seats: [
      { id: 1, number: '1A', status: 'available' },
      { id: 2, number: '1B', status: 'available' },
    ],
    ...overrides,
  };
}

describe('CheckoutView smoke', () => {
  it('shows insufficient wallet notice when wallet is lower than required total', () => {
    render(
      <CheckoutView
        userId="qa-user"
        trip={createTrip()}
        seats={['1A']}
        passengers={1}
        wallet={50}
        subscription="none"
        currentTrips={[]}
        onCreateBooking={vi.fn()}
        onSuccess={vi.fn()}
        showToast={vi.fn()}
        openModal={vi.fn()}
        isOnline
      />,
    );

    expect(screen.getByText('رصيد المحفظة غير كافٍ')).toBeTruthy();
  });

  it('opens overlap warning before creating the booking', async () => {
    const user = userEvent.setup();
    const onCreateBooking = vi.fn().mockResolvedValue({ ok: true, booking: {}, invoice: {} });

    render(
      <CheckoutView
        userId="qa-user"
        trip={createTrip({ instanceId: 'trip-002', bookingId: 'trip-002' })}
        seats={['1A']}
        passengers={1}
        wallet={500}
        subscription="none"
        currentTrips={[
          createTrip({
            instanceId: 'existing-trip',
            bookingId: 'existing-trip',
            to: 'المنصورة',
            toStationName: 'محطة المنصورة',
            departureTime: '11:00',
            arrivalTime: '14:00',
          }),
        ]}
        onCreateBooking={onCreateBooking}
        onSuccess={vi.fn()}
        showToast={vi.fn()}
        openModal={vi.fn()}
        isOnline
      />,
    );

    await user.click(screen.getByRole('button', { name: 'ادفع وأكد الحجز' }));

    await waitFor(() => {
      expect(screen.getByText('تنبيه قبل تأكيد الحجز')).toBeTruthy();
    });
    expect(onCreateBooking).not.toHaveBeenCalled();
  });
});
