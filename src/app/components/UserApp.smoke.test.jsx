import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const appMocks = vi.hoisted(() => ({
  refreshCloudState: vi.fn(async () => {}),
  searchTripInventory: vi.fn(),
  hydrateTripWithSeats: vi.fn(),
  holdTripSeats: vi.fn(),
  createBookingAtomic: vi.fn(),
  cancelBookingAtomic: vi.fn(),
}));

vi.mock('../hooks/useCloudAppState', async () => {
  const ReactModule = await import('react');
  return {
    useCloudAppState() {
      const [wallet, setWallet] = ReactModule.useState(0);
      const [transactions, setTransactions] = ReactModule.useState([]);
      const [myTrips, setMyTrips] = ReactModule.useState([]);
      const [points, setPoints] = ReactModule.useState(0);
      const [subscription, setSubscription] = ReactModule.useState('none');

      return {
        wallet,
        setWallet,
        transactions,
        setTransactions,
        myTrips,
        setMyTrips,
        points,
        setPoints,
        subscription,
        setSubscription,
        backendLoading: false,
        refreshCloudState: appMocks.refreshCloudState,
      };
    },
  };
});

vi.mock('../hooks/useTripNotifications', () => ({
  useTripNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAllRead: vi.fn(),
    clearNotifications: vi.fn(),
    requestBrowserPermission: vi.fn(),
  }),
}));

vi.mock('../hooks/useOnboardingGuide', () => ({
  useOnboardingGuide: () => ({
    isGuideOpen: false,
    openGuide: vi.fn(),
    closeGuide: vi.fn(),
    completeGuide: vi.fn(),
  }),
}));

vi.mock('../../lib/account', () => ({
  markOfferPopupSeen: vi.fn(async () => {}),
}));

vi.mock('../../lib/auth', () => ({
  signOutCurrentUser: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../lib/promoEngine', () => ({
  getPromoPopupOffer: vi.fn(async () => null),
}));

vi.mock('../../lib/tripInventory', () => ({
  searchTripInventory: appMocks.searchTripInventory,
  hydrateTripWithSeats: appMocks.hydrateTripWithSeats,
  holdTripSeats: appMocks.holdTripSeats,
  createBookingAtomic: appMocks.createBookingAtomic,
  cancelBookingAtomic: appMocks.cancelBookingAtomic,
}));

vi.mock('./ToastStack', () => ({
  default: () => null,
}));

vi.mock('./ui/OnboardingGuide', () => ({
  default: () => null,
}));

vi.mock('../screens/HomeView', () => ({
  default: () => <div>home view</div>,
}));

vi.mock('../screens/SearchResultsView', () => ({
  default: () => <div>search results view</div>,
}));

vi.mock('../screens/SeatSelectionView', () => ({
  default: () => <div>seat selection view</div>,
}));

vi.mock('../screens/CheckoutView', () => ({
  default: () => <div>checkout view</div>,
}));

vi.mock('../screens/InvoiceView', () => ({
  default: () => <div>invoice view</div>,
}));

vi.mock('../screens/TicketView', () => ({
  default: ({ ticket }) => <div>ticket view {ticket?.pnr}</div>,
}));

vi.mock('../screens/TripsView', () => ({
  default: () => <div>trips view</div>,
}));

vi.mock('../screens/TrackingView', () => ({
  default: () => <div>tracking view</div>,
}));

vi.mock('../screens/WalletView', () => ({
  default: () => <div>wallet view</div>,
}));

vi.mock('../screens/ProfileView', () => ({
  default: () => <div>profile view</div>,
}));

vi.mock('../modals/TopUpFlowModal', () => ({
  default: () => null,
}));
vi.mock('../modals/PointsModal', () => ({
  default: () => null,
}));
vi.mock('../modals/SubscriptionsModal', () => ({
  default: () => null,
}));
vi.mock('../modals/ChatbotModal', () => ({
  default: () => null,
}));
vi.mock('../modals/WalletQrModal', () => ({
  default: () => null,
}));
vi.mock('../modals/NotificationsModal', () => ({
  default: () => null,
}));
vi.mock('../modals/PromoOfferModal', () => ({
  default: () => null,
}));
vi.mock('./internal/InternalOpsPanel', () => ({
  default: () => null,
}));

import UserApp from './UserApp';

describe('UserApp smoke flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();

    appMocks.searchTripInventory.mockResolvedValue({
      isDirect: true,
      source: 'supabase',
      trips: [
        {
          instanceId: 'trip_1',
          id: 'trip_1',
          from: 'القاهرة',
          to: 'الإسكندرية',
          date: '2026-03-26',
          price: 120,
          company: 'Go Bus',
          class: 'VIP',
          departureTime: '10:00',
          arrivalTime: '13:00',
          durationHour: 3,
        },
      ],
    });

    appMocks.hydrateTripWithSeats.mockImplementation(async (trip) => ({
      ...trip,
      seats: [
        { id: 'seat_1', number: '1A', status: 'available' },
        { id: 'seat_2', number: '1B', status: 'available' },
      ],
    }));

    appMocks.holdTripSeats.mockResolvedValue({
      ok: true,
      hold_expires_at: '2099-03-26T10:05:00.000Z',
    });

    appMocks.createBookingAtomic.mockResolvedValue({
      ok: true,
      booking: {
        bookingId: 'booking_1',
        pnr: 'PNR123',
        from: 'القاهرة',
        to: 'الإسكندرية',
        date: '2026-03-26',
        price: 120,
        company: 'Go Bus',
        class: 'VIP',
        departureTime: '10:00',
        arrivalTime: '13:00',
        durationHour: 3,
        selectedSeats: ['1A'],
        ticketToken: 'ticket_token_1',
        qrPayload: 'ticket:PNR123',
      },
      invoice: {
        pnr: 'PNR123',
        total: 120,
        method: 'محفظة طريقي',
        date: '2026-03-25 12:00',
        items: [{ name: 'تذكرة (1)', price: 120 }],
      },
    });
  });

  it('runs the dev smoke flow through the real orchestration layer', async () => {
    render(
      <UserApp
        userId="user_1"
        profile={{
          display_name: 'Ziad',
          email: 'ziad@example.com',
          onboarding_completed_at: '2026-03-20T00:00:00.000Z',
        }}
        refreshProfile={vi.fn(async () => {})}
        authWarning=""
        isDark={false}
        setIsDark={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(window.taree2yDev).toBeTruthy();
      expect(typeof window.taree2yDev.smoke).toBe('function');
    });

    const result = await window.taree2yDev.smoke({
      from: 'القاهرة',
      to: 'الإسكندرية',
      passengers: 1,
      walletAmount: 1000,
    });

    expect(result.ok).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/ticket view PNR123/i)).toBeTruthy();
    });

    expect(appMocks.createBookingAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        tripInstanceId: 'trip_1',
        seatNumbers: ['1A'],
        passengers: 1,
      }),
    );
  });
});
