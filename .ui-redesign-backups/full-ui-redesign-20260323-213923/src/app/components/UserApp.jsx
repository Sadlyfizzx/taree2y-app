import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BusFront,
  ChevronRight,
  Home,
  Menu,
  Ticket,
  User,
  Wallet as WalletIcon,
} from 'lucide-react';
import {
  createLogger,
  isMissingRpcError,
} from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { useCloudAppState } from '../hooks/useCloudAppState';
import {
  generateTrips,
  getCancellationPolicy,
  getLocalDateInputValue,
} from '../utils/travel';
import {
  cancelBookingAtomic,
  createBookingAtomic,
  holdTripSeats,
  hydrateTripWithSeats,
  searchTripInventory,
} from '../../lib/tripInventory';
import { BottomNavItem, DesktopNavItem } from './ui/AppPrimitives';
import ToastStack from './ToastStack';
import HomeView from '../screens/HomeView';
import SearchResultsView from '../screens/SearchResultsView';
import SeatSelectionView from '../screens/SeatSelectionView';
import CheckoutView from '../screens/CheckoutView';
import InvoiceView from '../screens/InvoiceView';
import TripsView from '../screens/TripsView';
import TicketView from '../screens/TicketView';
import TrackingView from '../screens/TrackingView';
import WalletView from '../screens/WalletView';
import ProfileView from '../screens/ProfileView';
import TopUpFlowModal from '../modals/TopUpFlowModal';
import PointsModal from '../modals/PointsModal';
import CourierModal from '../modals/CourierModal';
import SubscriptionsModal from '../modals/SubscriptionsModal';
import ChatbotModal from '../modals/ChatbotModal';
import FoodOrderModal from '../modals/FoodOrderModal';

const log = createLogger('user-app');

const buildInvoiceItems = ({
  passengers,
  baseTotal,
  luggageFee,
  rideFee,
  autoDiscount,
  promoDiscount,
}) => [
  { name: `تذاكر (${passengers})`, price: baseTotal },
  ...(luggageFee > 0 ? [{ name: 'وزن إضافي', price: luggageFee }] : []),
  ...(rideFee > 0 ? [{ name: 'أوبر للمحطة', price: rideFee }] : []),
  ...(autoDiscount > 0 ? [{ name: 'خصم الباقة', price: -autoDiscount }] : []),
  ...(promoDiscount > 0 ? [{ name: 'كود خصم', price: -promoDiscount }] : []),
];

const getPromoDiscount = (promoCode, baseTotal) => {
  const normalized = String(promoCode || '').trim().toUpperCase();
  if (!normalized) return 0;
  if (normalized === 'AHLAN50') return 50;
  if (normalized === 'EID26') return Math.floor(baseTotal * 0.2);
  if (normalized === 'SA3EED15') return Math.floor(baseTotal * 0.15);
  if (normalized === 'STUDENT20') return Math.floor(baseTotal * 0.2);
  return 0;
};

const formatCancellationErrorMessage = (result) => {
  if (!result) {
    return 'تعذر إلغاء الحجز حالياً';
  }

  if (result.errorClass === 'missing_rpc' || isMissingRpcError(result)) {
    return 'ميزة الإلغاء غير مفعلة على السيرفر حالياً. تم إيقاف العملية بدون أي تعديل على الحجز أو المحفظة. طبّق آخر migration ثم أعد المحاولة.';
  }

  return result.message || 'تعذر إلغاء الحجز حالياً';
};

export default function UserApp({
  userId,
  profile,
  isDark,
  setIsDark,
  runtimeMode = 'supabase',
}) {
  const todayDate = getLocalDateInputValue();
  const user = useMemo(
    () => ({
      name: profile?.display_name || 'مستخدم',
      phone: profile?.phone || '',
    }),
    [profile],
  );

  const {
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
    backendLoading,
    refreshCloudState,
  } = useCloudAppState(userId);

  const [activeTab, setActiveTab] = useState('home');
  const [activeView, setActiveView] = useState('main');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchParams, setSearchParams] = useState({
    from: '',
    to: '',
    date: todayDate,
    passengers: 1,
  });
  const [searchResults, setSearchResults] = useState({ trips: [], isDirect: true });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [viewedTicket, setViewedTicket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [pendingCancellationBookingIds, setPendingCancellationBookingIds] = useState([]);

  const qaStateRef = useRef({});
  qaStateRef.current = {
    wallet,
    transactions,
    myTrips,
    points,
    subscription,
    searchParams,
    searchResults,
    selectedTrip,
    selectedSeats,
    currentInvoice,
    viewedTicket,
    activeTab,
    activeView,
  };

  const showToast = (msg, type = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const navigateTo = (view, tab = activeTab) => {
    log.debug('navigate', {
      fromView: activeView,
      toView: view,
      fromTab: activeTab,
      toTab: tab,
    });

    setActiveView(view);
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (activeView === 'invoice') navigateTo('main', 'home');
    else if (activeView === 'checkout') navigateTo('seats');
    else if (activeView === 'seats') navigateTo('search');
    else if (activeView === 'search') navigateTo('main', 'home');
    else if (['ticket', 'tracking'].includes(activeView)) navigateTo('main', 'trips');
    else navigateTo('main', 'home');
  };

  const handleSearch = async (predefinedParams = null) => {
    const params = predefinedParams || searchParams;

    if (!params.from || !params.to || !params.date) {
      return showToast('حدد مكان التحرك والوصول وتاريخ الرحلة الأول 📍', 'error');
    }

    if (params.from === params.to) {
      return showToast('مكان الانطلاق هو هو مكان الوصول!', 'error');
    }

    if (predefinedParams) setSearchParams(params);

    setIsSearching(true);
    navigateTo('search');

    try {
      const results = await searchTripInventory({
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
      });

      setSearchResults(results);

      if (results.source === 'fallback') {
        showToast(
          'شغّلنا البحث الاحتياطي لأن جداول الرحلات لسه ما اتطبقتش بالكامل',
          'error',
        );
      }
    } catch (error) {
      log.error('search_failed', {
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
        error,
      });

      setSearchResults(generateTrips(params.from, params.to, params.date));
      showToast('تعذر تحميل الرحلات من السيرفر. رجعنا للوضع التجريبي.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const createDemoBookingResult = ({
    trip,
    seatNumbers,
    passengers,
    promoCode,
    hasLuggage,
    rideToStation,
    needsAccess,
  }) => {
    const subDiscountRate =
      subscription === 'student' ? 0.15 : subscription === 'vip' ? 0.25 : 0;
    const baseTotal = trip.price * passengers;
    const autoDiscount = Math.floor(baseTotal * subDiscountRate);
    const promoDiscount = getPromoDiscount(promoCode, baseTotal);
    const luggageFee = hasLuggage ? 50 * passengers : 0;
    const rideFee = rideToStation ? 80 : 0;
    const finalTotal = Math.max(
      0,
      baseTotal + luggageFee + rideFee - autoDiscount - promoDiscount,
    );
    const pointsToAwardLater = Math.max(
      0,
      Math.floor(Math.max(0, baseTotal - autoDiscount - promoDiscount) / 5),
    );

    if (wallet < finalTotal) {
      return { ok: false, message: 'رصيد المحفظة مش كفاية للتأكيد.' };
    }

    const pnr = `TRQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const bookingDate = getLocalDateInputValue();

    const ticket = {
      ...trip,
      id: `demo-${pnr}`,
      bookingId: `demo-${pnr}`,
      pnr,
      bookingDate,
      date: trip.date,
      selectedSeats: seatNumbers,
      finalTotal,
      paymentMethod: 'wallet',
      status: 'upcoming',
      earnedPointsPending: pointsToAwardLater,
      pointsAwarded: false,
      luggage: hasLuggage,
      ride: rideToStation,
      access: needsAccess,
      ticketToken: `demo-token-${pnr}`,
      qrPayload: `demo-booking:${pnr}`,
      source: 'local',
    };

    const invoice = {
      pnr,
      total: finalTotal,
      method: 'محفظة طريقي',
      date: new Date().toLocaleString('ar-EG'),
      items: buildInvoiceItems({
        passengers,
        baseTotal,
        luggageFee,
        rideFee,
        autoDiscount,
        promoDiscount,
      }),
    };

    setWallet((prev) => prev - finalTotal);
    setTransactions((prev) => [
      {
        id: `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        type: 'debit',
        amount: finalTotal,
        date: bookingDate,
        desc: `تذكرة: ${trip.from} - ${trip.to}`,
      },
      ...prev,
    ]);

    log.info('demo_booking_created', {
      pnr,
      passengers,
      finalTotal,
      runtimeMode,
    });

    return { ok: true, booking: ticket, invoice };
  };

  const finalizeBookingSuccess = (ticket, invoice) => {
    if (String(ticket?.bookingId || ticket?.id || '').startsWith('demo-')) {
      setMyTrips((prev) => [ticket, ...prev]);
    }

    setCurrentInvoice(invoice);
    setViewedTicket(ticket);

    log.info('booking_finalized', {
      bookingId: ticket?.bookingId || ticket?.id || null,
      pnr: ticket?.pnr || null,
      runtimeMode,
    });

    navigateTo('invoice');
  };

  const createBookingForTrip = async ({
    trip,
    seatNumbers,
    passengers,
    promoCode,
    hasLuggage,
    rideToStation,
    needsAccess,
  }) => {
    if (!trip?.instanceId) {
      return createDemoBookingResult({
        trip,
        seatNumbers,
        passengers,
        promoCode,
        hasLuggage,
        rideToStation,
        needsAccess,
      });
    }

    const result = await createBookingAtomic({
      tripInstanceId: trip.instanceId,
      seatNumbers,
      passengers,
      promoCode,
      hasLuggage,
      rideToStation,
      needsAccess,
    });

    if (result?.ok) {
      await refreshCloudState({ silent: true, force: true });
    }

    return result;
  };

  const commitSeatSelection = async (
    tripArg = selectedTrip,
    seatNumbersArg = selectedSeats,
  ) => {
    if (!tripArg) {
      return { ok: false, message: 'No trip selected' };
    }

    if (!tripArg?.instanceId) {
      navigateTo('checkout');
      return { ok: true, source: 'demo' };
    }

    const holdResult = await holdTripSeats({
      tripInstanceId: tripArg.instanceId,
      seatNumbers: seatNumbersArg,
    });

    if (!holdResult?.ok) {
      showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة', 'error');

      try {
        setSelectedTrip(await hydrateTripWithSeats(tripArg));
      } catch (error) {
        log.warn('seat_rehydrate_after_hold_failure_failed', {
          tripInstanceId: tripArg.instanceId,
          error,
        });
      }

      return holdResult;
    }

    setSelectedTrip((prev) => ({
      ...prev,
      holdExpiresAt: holdResult.hold_expires_at || holdResult.holdExpiresAt || null,
    }));
    navigateTo('checkout');
    return holdResult;
  };

  const processDelayedRefund = async (tripToCancel) => {
    const bookingId = tripToCancel?.bookingId || tripToCancel?.id || null;
    const bookingIdText = String(bookingId || '');
    const isDemoBooking = bookingIdText.startsWith('demo-');

    if (bookingId && !isDemoBooking) {
      setPendingCancellationBookingIds((prev) =>
        prev.includes(bookingId) ? prev : [...prev, bookingId],
      );
      setMyTrips((prev) =>
        prev.map((trip) => {
          const tripKey = trip.bookingId || trip.id || null;
          if (tripKey !== bookingId) return trip;
          return { ...trip, status: 'refund_pending' };
        }),
      );

      log.info('booking_cancel_requested', {
        bookingId,
        pnr: tripToCancel?.pnr || null,
      });

      try {
        const result = await cancelBookingAtomic({ bookingId });

        if (!result?.ok) {
          log.warn('booking_cancel_rejected', {
            bookingId,
            pnr: tripToCancel?.pnr || null,
            errorClass: result?.errorClass || null,
            code: result?.code || null,
            httpStatus: result?.httpStatus || null,
            reason: result?.message || 'unknown',
          });

          showToast(formatCancellationErrorMessage(result), 'error');
          await refreshCloudState({ silent: true, force: true });
          return;
        }

        log.info('booking_cancel_completed', {
          bookingId,
          pnr: tripToCancel?.pnr || null,
          refundAmount: Number(result?.refundAmount || 0),
        });

        showToast(
          `تم الإلغاء! رجعلك ${Number(result?.refundAmount || 0)} ج.م للمحفظة 💸`,
          'success',
        );
        await refreshCloudState({ silent: true, force: true });
      } catch (error) {
        log.error('booking_cancel_failed', {
          bookingId,
          pnr: tripToCancel?.pnr || null,
          error,
        });

        showToast(formatCancellationErrorMessage(error), 'error');

        try {
          await refreshCloudState({ silent: true, force: true });
        } catch (refreshError) {
          log.warn('booking_cancel_refresh_failed', {
            bookingId,
            error: refreshError,
          });
        }
      } finally {
        setPendingCancellationBookingIds((prev) =>
          prev.filter((id) => id !== bookingId),
        );
      }
      return;
    }

    const policy = getCancellationPolicy(tripToCancel);
    if (!policy.allowed) return showToast(policy.message, 'error');

    const refundAmount = Number(policy.refundAmount || 0);

    setMyTrips((prev) =>
      prev.map((trip) =>
        trip.pnr === tripToCancel.pnr ? { ...trip, status: 'refund_pending' } : trip,
      ),
    );

    showToast('جاري الإلغاء ومعالجة طلب الاسترداد ⏳', 'success');

    window.setTimeout(() => {
      setMyTrips((currentTrips) => {
        const exists = currentTrips.find((trip) => trip.pnr === tripToCancel.pnr);
        if (!exists) return currentTrips;

        setWallet((value) => value + refundAmount);
        setTransactions((value) => [
          {
            id: `REF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            type: 'credit',
            amount: refundAmount,
            date: getLocalDateInputValue(),
            desc: `استرداد تذكرة ${tripToCancel.pnr}`,
          },
          ...value,
        ]);

        return currentTrips.map((trip) =>
          trip.pnr === tripToCancel.pnr
            ? { ...trip, status: 'cancelled', pointsAwarded: false, source: 'local' }
            : trip,
        );
      });

      showToast(`تم الإلغاء! رجعلك ${refundAmount} ج.م للمحفظة 💸`, 'success');
    }, 800);
  };

  // DEV helper intentionally exposes a stable inspection surface without
  // re-wrapping every action in useCallback.
    useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

    const api = {
      snapshot() {
        return JSON.parse(JSON.stringify(qaStateRef.current));
      },

      async seedWallet(amount = 500, desc = 'شحن رصيد تجريبي (QA)') {
        const numericAmount = Math.max(0, Number(amount) || 0);
        if (!numericAmount) return 0;
        setWallet((prev) => prev + numericAmount);
        setTransactions((prev) => [
          {
            id: `QA-TOPUP-${Date.now()}`,
            type: 'credit',
            amount: numericAmount,
            date: getLocalDateInputValue(),
            desc,
          },
          ...prev,
        ]);
        await wait();
        return numericAmount;
      },

      async resetDemoState() {
        setWallet(0);
        setTransactions([]);
        setMyTrips([]);
        setPoints(0);
        setSubscription('none');
        setSelectedTrip(null);
        setSelectedSeats([]);
        setCurrentInvoice(null);
        setViewedTicket(null);
        navigateTo('main', 'home');
        await wait();
        return true;
      },

      async goHome() {
        navigateTo('main', 'home');
        await wait();
        return 'home';
      },

      async goWallet() {
        navigateTo('main', 'wallet');
        await wait();
        return 'wallet';
      },

      async goTrips() {
        navigateTo('main', 'trips');
        await wait();
        return 'trips';
      },

      async search(params = {}) {
        const next = {
          from: params.from || qaStateRef.current.searchParams?.from || 'القاهرة',
          to: params.to || qaStateRef.current.searchParams?.to || 'الإسكندرية',
          date: params.date || getLocalDateInputValue(),
          passengers: Number(
            params.passengers || qaStateRef.current.searchParams?.passengers || 1,
          ),
        };
        await handleSearch(next);
        await wait(250);
        return this.snapshot().searchResults;
      },

      async openTrip(index = 0) {
        const trips = qaStateRef.current.searchResults?.trips || [];
        const trip = trips[index];
        if (!trip) return null;

        try {
          const hydrated = await hydrateTripWithSeats(trip);
          setSelectedTrip(hydrated);
          setSelectedSeats([]);
          navigateTo('seats');
          await wait(150);
          return hydrated;
        } catch (error) {
          log.error('dev_open_trip_failed', { error });
          throw error;
        }
      },

      async selectSeats(seatsOrCount = 1, tripOverride = null) {
        const trip = tripOverride || qaStateRef.current.selectedTrip;
        if (!trip?.seats?.length) return [];

        let chosen = [];
        if (Array.isArray(seatsOrCount)) {
          chosen = seatsOrCount;
        } else {
          const count = Math.max(1, Number(seatsOrCount) || 1);
          chosen = trip.seats
            .filter(
              (seat) =>
                seat.status === 'available' ||
                (seat.status === 'held' && seat.heldByCurrentUser),
            )
            .slice(0, count)
            .map((seat) => seat.number);
        }

        setSelectedSeats(chosen);
        await wait();
        return chosen;
      },

      async goCheckout(tripOverride = null, seatsOverride = null) {
        const result = await commitSeatSelection(
          tripOverride || qaStateRef.current.selectedTrip,
          seatsOverride || qaStateRef.current.selectedSeats,
        );
        await wait(150);
        return result;
      },

      async book(options = {}) {
        const state = qaStateRef.current;
        const trip = options.trip || state.selectedTrip;
        const seatNumbers = options.seatNumbers || state.selectedSeats;
        const passengers = Number(
          options.passengers ||
            state.searchParams?.passengers ||
            seatNumbers?.length ||
            1,
        );

        const result = await createBookingForTrip({
          trip,
          seatNumbers,
          passengers,
          promoCode: options.promoCode || '',
          hasLuggage: Boolean(options.hasLuggage),
          rideToStation: Boolean(options.rideToStation),
          needsAccess: Boolean(options.needsAccess),
        });

        if (result?.ok) {
          finalizeBookingSuccess(result.booking, result.invoice);
          await wait(150);
        }

        return result;
      },

      async continueToTicket() {
        navigateTo('ticket');
        await wait();
        return 'ticket';
      },

      async smoke({
        from = 'القاهرة',
        to = 'الإسكندرية',
        passengers = 1,
        walletAmount = 1200,
      } = {}) {
        await this.seedWallet(walletAmount);
        await this.search({ from, to, passengers, date: getLocalDateInputValue() });

        const trip = await this.openTrip(0);
        if (!trip) return { ok: false, message: 'No trip found in smoke flow' };

        const seats = await this.selectSeats(passengers, trip);
        const holdResult = await this.goCheckout(trip, seats);
        if (!holdResult?.ok) return holdResult;

        const bookingResult = await this.book({ trip, seatNumbers: seats, passengers });
        if (bookingResult?.ok) {
          await this.continueToTicket();
        }
        return bookingResult;
      },
    };

    window.taree2yDev = api;
    return () => {
      if (window.taree2yDev === api) {
        delete window.taree2yDev;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    activeView,
    currentInvoice,
    myTrips,
    points,
    refreshCloudState,
    searchResults,
    searchParams,
    selectedSeats,
    selectedTrip,
    subscription,
    transactions,
    viewedTicket,
    wallet,
  ]);

  if (backendLoading) {
    return (
      <div className="flex-1 grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200">
        جاري تحميل بياناتك من السحابة...
      </div>
    );
  }

  return (
    <>
      <ToastStack toasts={toasts} />

      {runtimeMode === 'local-demo' && (
        <div className="absolute top-14 md:top-0 inset-x-0 z-40 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-black">
          بعض الميزات تعمل حالياً في وضع محلي تجريبي بدون مصادقة أو مزامنة سحابية.
        </div>
      )}

      <aside
        className={`hidden md:flex bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col h-full sticky top-0 z-40 shadow-sm transition-all duration-300 ${
          isSidebarOpen ? 'w-72' : 'w-24'
        }`}
      >
        <div
          className={`p-6 flex items-center ${
            isSidebarOpen ? 'justify-between gap-3' : 'justify-center'
          } cursor-pointer transition-all`}
        >
          <div
            className={`flex items-center ${
              isSidebarOpen ? 'justify-start gap-3' : 'justify-center'
            }`}
            onClick={() => navigateTo('main', 'home')}
          >
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <BusFront className="w-7 h-7" />
            </div>
            {isSidebarOpen && (
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  طريقي
                </h1>
                <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold whitespace-nowrap">
                  رحلتك بتبدأ من هنا
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((value) => !value)}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 grid place-items-center"
            aria-label="toggle-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <DesktopNavItem
            icon={<Home />}
            label="الرئيسية"
            active={activeTab === 'home'}
            onClick={() => navigateTo('main', 'home')}
            collapsed={!isSidebarOpen}
          />
          <DesktopNavItem
            icon={<Ticket />}
            label="تذاكري"
            active={activeTab === 'trips'}
            onClick={() => navigateTo('main', 'trips')}
            collapsed={!isSidebarOpen}
          />
          <DesktopNavItem
            icon={<WalletIcon />}
            label="المحفظة"
            active={activeTab === 'wallet'}
            onClick={() => navigateTo('main', 'wallet')}
            collapsed={!isSidebarOpen}
          />
          <DesktopNavItem
            icon={<User />}
            label="حسابي"
            active={activeTab === 'profile'}
            onClick={() => navigateTo('main', 'profile')}
            collapsed={!isSidebarOpen}
          />
        </nav>
      </aside>

      <div className="flex-1 flex flex-col relative h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <header className="md:hidden px-5 pt-10 pb-4 z-10 flex justify-between items-center transition-colors bg-indigo-600 dark:bg-slate-900 text-white border-none shadow-md shrink-0">
          {activeView !== 'main' ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition text-white font-bold text-sm"
            >
              <ChevronRight className="w-5 h-5" />
              رجوع
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 dark:bg-indigo-600/50 rounded-2xl flex items-center justify-center">
                <BusFront className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">طريقي</h1>
                <p className="text-white/80 text-[10px] font-bold">الـ Super App 🇪🇬</p>
              </div>
            </div>
          )}

          {activeView === 'main' && (
            <div
              onClick={() => navigateTo('main', 'wallet')}
              className="bg-white/10 dark:bg-slate-800/50 px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer border border-white/20 hover:bg-white/20 transition"
              dir="ltr"
            >
              <WalletIcon className="w-4 h-4 text-emerald-300" />
              <span className="font-bold text-sm text-white">{wallet} ج</span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto relative hide-scrollbar scroll-smooth flex flex-col w-full">
          <div className="w-full mx-auto max-w-[1800px] flex-1 flex flex-col pb-32 md:pb-8 px-0 lg:px-8">
            {activeView === 'main' && activeTab === 'home' && (
              <HomeView
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                onSearch={() => handleSearch()}
                showToast={showToast}
                onPromoSearch={handleSearch}
                openModal={setActiveModal}
              />
            )}

            {activeView === 'search' && (
              <SearchResultsView
                searchParams={searchParams}
                searchResults={searchResults}
                isSearching={isSearching}
                onSelectTrip={async (trip) => {
                  try {
                    const hydrated = await hydrateTripWithSeats(trip);
                    setSelectedTrip(hydrated);
                    setSelectedSeats([]);
                    navigateTo('seats');
                  } catch (error) {
                    log.error('seat_load_failed_before_selection', {
                      tripInstanceId: trip?.instanceId || null,
                      error,
                    });
                    showToast('تعذر تحميل المقاعد من السيرفر', 'error');
                  }
                }}
                showToast={showToast}
              />
            )}

            {activeView === 'seats' && selectedTrip && (
              <SeatSelectionView
                trip={selectedTrip}
                passengers={searchParams.passengers}
                selectedSeats={selectedSeats}
                setSelectedSeats={setSelectedSeats}
                onConfirm={async () => {
                  await commitSeatSelection();
                }}
                showToast={showToast}
              />
            )}

            {activeView === 'checkout' && selectedTrip && (
              <CheckoutView
                trip={selectedTrip}
                seats={selectedSeats}
                passengers={searchParams.passengers}
                wallet={wallet}
                subscription={subscription}
                onCreateBooking={createBookingForTrip}
                onSuccess={finalizeBookingSuccess}
                showToast={showToast}
                openModal={setActiveModal}
              />
            )}

            {activeView === 'invoice' && currentInvoice && (
              <InvoiceView invoice={currentInvoice} onContinue={() => navigateTo('ticket')} />
            )}

            {activeView === 'main' && activeTab === 'trips' && (
              <TripsView
                trips={myTrips}
                setMyTrips={setMyTrips}
                processRefund={processDelayedRefund}
                pendingCancellationBookingIds={pendingCancellationBookingIds}
                onViewTicket={(ticket) => {
                  setViewedTicket(ticket);
                  navigateTo('ticket');
                }}
                showToast={showToast}
              />
            )}

            {activeView === 'ticket' && viewedTicket && (
              <TicketView
                ticket={viewedTicket}
                user={user}
                onTrack={() => navigateTo('tracking')}
                showToast={showToast}
              />
            )}

            {activeView === 'tracking' && viewedTicket && (
              <TrackingView
                ticket={viewedTicket}
                showToast={showToast}
                openModal={setActiveModal}
              />
            )}

            {activeView === 'main' && activeTab === 'wallet' && (
              <WalletView
                wallet={wallet}
                setWallet={setWallet}
                transactions={transactions}
                setTransactions={setTransactions}
                showToast={showToast}
                openTopUp={() => setActiveModal('topup')}
              />
            )}

            {activeView === 'main' && activeTab === 'profile' && (
              <ProfileView
                user={user}
                points={points}
                subscription={subscription}
                isDark={isDark}
                setIsDark={setIsDark}
                onLogout={async () => {
                  const { error } = await supabase.auth.signOut();
                  if (error) {
                    log.error('logout_failed', { error });
                    showToast('تعذر تسجيل الخروج حالياً', 'error');
                    return;
                  }

                  log.info('logout_succeeded');
                }}
                showToast={showToast}
                openModal={setActiveModal}
              />
            )}
          </div>
        </main>

        {activeView === 'main' && (
          <div className="md:hidden fixed bottom-4 w-[calc(100%-32px)] left-4 z-40">
            <nav className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl flex justify-around items-center p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
              <BottomNavItem
                icon={<Home />}
                label="الرئيسية"
                active={activeTab === 'home'}
                onClick={() => navigateTo('main', 'home')}
              />
              <BottomNavItem
                icon={<Ticket />}
                label="تذاكري"
                active={activeTab === 'trips'}
                onClick={() => navigateTo('main', 'trips')}
              />
              <BottomNavItem
                icon={<WalletIcon />}
                label="المحفظة"
                active={activeTab === 'wallet'}
                onClick={() => navigateTo('main', 'wallet')}
              />
              <BottomNavItem
                icon={<User />}
                label="حسابي"
                active={activeTab === 'profile'}
                onClick={() => navigateTo('main', 'profile')}
              />
            </nav>
          </div>
        )}
      </div>

      {activeModal === 'courier' && (
        <CourierModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          showToast={showToast}
        />
      )}

      {activeModal === 'bot' && (
        <ChatbotModal closeModal={() => setActiveModal(null)} user={user} />
      )}

      {activeModal === 'subs' && (
        <SubscriptionsModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          subscription={subscription}
          setSubscription={setSubscription}
          showToast={showToast}
        />
      )}

      {activeModal === 'food' && (
        <FoodOrderModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          showToast={showToast}
        />
      )}

      {activeModal === 'points' && (
        <PointsModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          points={points}
          setPoints={setPoints}
          showToast={showToast}
        />
      )}

      {activeModal === 'topup' && (
        <TopUpFlowModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          showToast={showToast}
        />
      )}
    </>
  );
}
