import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BusFront,
  ChevronRight,
  Home,
  Menu,
  Ticket,
  User,
  Wallet as WalletIcon,
} from 'lucide-react';
import { createLogger, isMissingRpcError } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { useCloudAppState } from '../hooks/useCloudAppState';
import { useTripNotifications } from '../hooks/useTripNotifications';
import {
  generateTrips,
  getCancellationPolicy,
  getLocalDateInputValue,
} from '../utils/travel';
import { ensureTicketIdentity } from '../utils/tripIdentity';
import {
  cancelBookingAtomic,
  createBookingAtomic,
  holdTripSeats,
  hydrateTripWithSeats,
  searchTripInventory,
} from '../../lib/tripInventory';
import { useOnboardingGuide } from '../hooks/useOnboardingGuide';
import { BottomNavItem, DesktopNavItem, MetaChip } from './ui/AppPrimitives';
import OnboardingGuide from './ui/OnboardingGuide';
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
import WalletQrTopUpModal from '../modals/WalletQrTopUpModal';
import PointsModal from '../modals/PointsModal';
import CourierModal from '../modals/CourierModal';
import SubscriptionsModal from '../modals/SubscriptionsModal';
import ChatbotModal from '../modals/ChatbotModal';
import FoodOrderModal from '../modals/FoodOrderModal';
import NotificationsModal from '../modals/NotificationsModal';

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
  ...(rideFee > 0 ? [{ name: 'توصيلة للمحطة', price: rideFee }] : []),
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
    return 'تعذر إلغاء الحجز حالياً.';
  }

  if (result.errorClass === 'missing_rpc' || isMissingRpcError(result)) {
    return 'ميزة الإلغاء غير مفعلة على السيرفر حالياً. تم إيقاف العملية بدون أي تعديل على الحجز أو المحفظة.';
  }

  return result.message || 'تعذر إلغاء الحجز حالياً.';
};

const getHeaderContent = (activeView, activeTab) => {
  if (activeView === 'search') return { title: 'اختيار الرحلة', subtitle: 'قارن بين الميعاد والمحطة والسعر' };
  if (activeView === 'seats') return { title: 'اختيار المقاعد', subtitle: 'حدد المقاعد قبل مراجعة الدفع' };
  if (activeView === 'checkout') return { title: 'الدفع والتأكيد', subtitle: 'راجع كل شيء قبل الحجز النهائي' };
  if (activeView === 'invoice') return { title: 'تم الحجز', subtitle: 'التذكرة جاهزة دلوقتي' };
  if (activeView === 'ticket') return { title: 'التذكرة', subtitle: 'النسخة الحديثة + التصدير + QR' };
  if (activeView === 'tracking') return { title: 'متابعة الرحلة', subtitle: 'شارك الحالة عبر رابط عام حقيقي' };
  if (activeTab === 'trips') return { title: 'رحلاتي', subtitle: 'الجاية والسابقة والملغية' };
  if (activeTab === 'wallet') return { title: 'المحفظة', subtitle: 'الرصيد والحركات' };
  if (activeTab === 'profile') return { title: 'حسابي', subtitle: 'الإعدادات والمزايا' };
  return { title: 'طريقي', subtitle: 'رحلات مصر بشكل أوضح وأسهل' };
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

  const { isGuideOpen, openGuide, closeGuide, completeGuide } = useOnboardingGuide();

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

  const {
    notifications,
    unreadCount,
    markAllRead,
    clearNotifications,
    requestBrowserPermission,
  } = useTripNotifications({
    trips: myTrips,
    onNotify: (entry) => showToast(entry.title, 'success'),
  });

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
      return showToast('حدد مكان التحرك والوصول وتاريخ الرحلة الأول.', 'error');
    }

    if (params.from === params.to) {
      return showToast('محافظة التحرك هي نفس محافظة الوصول.', 'error');
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
        showToast('شغّلنا البحث الاحتياطي لأن جداول الرحلات لسه ما اتطبقتش بالكامل.', 'error');
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
    const finalTotal = Math.max(0, baseTotal + luggageFee + rideFee - autoDiscount - promoDiscount);
    const pointsToAwardLater = Math.max(
      0,
      Math.floor(Math.max(0, baseTotal - autoDiscount - promoDiscount) / 5),
    );

    if (wallet < finalTotal) {
      return { ok: false, message: 'رصيد المحفظة مش كفاية للتأكيد.' };
    }

    const pnr = `TRQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const bookingDate = getLocalDateInputValue();

    const ticket = ensureTicketIdentity({
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
    });

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
    const normalizedTicket = ensureTicketIdentity(ticket);

    if (String(normalizedTicket?.bookingId || normalizedTicket?.id || '').startsWith('demo-')) {
      setMyTrips((prev) => [normalizedTicket, ...prev]);
    }

    setCurrentInvoice(invoice);
    setViewedTicket(normalizedTicket);

    log.info('booking_finalized', {
      bookingId: normalizedTicket?.bookingId || normalizedTicket?.id || null,
      pnr: normalizedTicket?.pnr || null,
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
      if (result.booking) {
        result.booking = ensureTicketIdentity(result.booking);
      }
    }

    return result;
  };

  const commitSeatSelection = async (tripArg = selectedTrip, seatNumbersArg = selectedSeats) => {
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
      showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة.', 'error');

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
          `تم الإلغاء، ورجعلك ${Number(result?.refundAmount || 0)} ج.م للمحفظة.`,
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
        setPendingCancellationBookingIds((prev) => prev.filter((id) => id !== bookingId));
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

    showToast('جاري الإلغاء ومعالجة طلب الاسترداد.', 'success');

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

      showToast(`تم الإلغاء، ورجعلك ${refundAmount} ج.م للمحفظة.`, 'success');
    }, 800);
  };

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
          passengers: Number(params.passengers || qaStateRef.current.searchParams?.passengers || 1),
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
                seat.status === 'available' || (seat.status === 'held' && seat.heldByCurrentUser),
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
        const passengers = Number(options.passengers || state.searchParams?.passengers || seatNumbers?.length || 1);
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
      async smoke({ from = 'القاهرة', to = 'الإسكندرية', passengers = 1, walletAmount = 1200 } = {}) {
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
      <div className="flex-1 grid place-items-center bg-[var(--bg)] text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        جاري تجهيز بيانات حسابك…
      </div>
    );
  }

  const headerContent = getHeaderContent(activeView, activeTab);

  return (
    <>
      <ToastStack toasts={toasts} />

      {runtimeMode === 'local-demo' ? (
        <div className="absolute inset-x-0 top-0 z-50 px-4 py-2">
          <div className="mx-auto max-w-[1200px] rounded-b-[22px] border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-black text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
            بعض الميزات حالياً شغالة في وضع محلي تجريبي بدون مزامنة كاملة.
          </div>
        </div>
      ) : null}

      <aside
        className={`hidden h-full flex-col border-l border-slate-200 bg-slate-50/80 px-4 py-5 dark:border-slate-800 dark:bg-slate-950/80 md:flex ${
          isSidebarOpen ? 'w-[300px]' : 'w-[104px]'
        }`}
      >
        <div className={`flex items-center ${isSidebarOpen ? 'justify-between gap-3' : 'justify-center'}`}>
          <button
            type="button"
            onClick={() => navigateTo('main', 'home')}
            className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'} text-right`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-lg shadow-indigo-600/25">
              <BusFront className="h-7 w-7" />
            </span>
            {isSidebarOpen ? (
              <span>
                <span className="block text-2xl font-black text-slate-900 dark:text-white">طريقي</span>
                <span className="mt-1 block text-xs font-black text-slate-400 dark:text-slate-500">رحلتك واضحة من أول خطوة</span>
              </span>
            ) : null}
          </button>
          {isSidebarOpen ? (
            <button
              type="button"
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {!isSidebarOpen ? (
          <button
            type="button"
            onClick={() => setIsSidebarOpen((value) => !value)}
            className="mt-4 grid h-11 w-full place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        <nav className="mt-6 flex-1 space-y-2">
          <DesktopNavItem icon={<Home />} label="الرئيسية" active={activeTab === 'home'} onClick={() => navigateTo('main', 'home')} collapsed={!isSidebarOpen} />
          <DesktopNavItem icon={<Ticket />} label="رحلاتي" active={activeTab === 'trips'} onClick={() => navigateTo('main', 'trips')} collapsed={!isSidebarOpen} />
          <DesktopNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab === 'wallet'} onClick={() => navigateTo('main', 'wallet')} collapsed={!isSidebarOpen} />
          <DesktopNavItem icon={<User />} label="حسابي" active={activeTab === 'profile'} onClick={() => navigateTo('main', 'profile')} collapsed={!isSidebarOpen} />
        </nav>

        {isSidebarOpen ? (
          <div className="mt-8 space-y-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-black text-slate-900 dark:text-white">ملخص سريع</p>
            <div className="flex flex-wrap gap-2">
              <MetaChip label={`الرصيد ${wallet} ج.م`} tone="brand" />
              <MetaChip label={`النقاط ${points}`} tone="success" />
              <MetaChip label={`التنبيهات ${unreadCount}`} tone={unreadCount ? 'warning' : 'neutral'} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openGuide} className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                افتح دليل الاستخدام
              </button>
              <button type="button" onClick={() => setActiveModal('notifications')} className="text-sm font-black text-slate-600 dark:text-slate-300">
                التنبيهات
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col bg-[var(--bg)] dark:bg-slate-950">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(33,86,217,0.10), transparent 24%), radial-gradient(circle at bottom left, rgba(15,159,138,0.08), transparent 20%), linear-gradient(rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.03) 1px, transparent 1px)', backgroundSize: 'auto, auto, 24px 24px, 24px 24px' }} />

        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 px-4 py-4 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/88 md:px-6">
          <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {activeView !== 'main' ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-5 w-5" />
                  رجوع
                </button>
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-lg shadow-indigo-600/20 md:hidden">
                  <BusFront className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-slate-900 dark:text-white">{headerContent.title}</p>
                <p className="truncate text-sm font-bold text-slate-500 dark:text-slate-400">{headerContent.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openGuide}
                className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:text-indigo-300 md:inline-flex"
              >
                الدليل
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('notifications')}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
                aria-label="التنبيهات"
              >
                <Bell className="h-5 w-5" />
                {unreadCount ? (
                  <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('main', 'wallet')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
                dir="ltr"
              >
                <WalletIcon className="h-4 w-4 text-emerald-500" />
                {wallet} ج
              </button>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col px-4 pb-28 pt-4 md:px-6 md:pb-8 md:pt-6 xl:px-8">
            {activeView === 'main' && activeTab === 'home' ? (
              <HomeView
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                onSearch={() => handleSearch()}
                showToast={showToast}
                onPromoSearch={handleSearch}
                openModal={setActiveModal}
                openGuide={openGuide}
              />
            ) : null}

            {activeView === 'search' ? (
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
                      tripCode: trip?.tripCode || trip?.id || null,
                      errorMessage: error?.message || null,
                      errorCode: error?.code || null,
                      errorDetails: error?.details || null,
                      errorHint: error?.hint || null,
                      error,
                    });
                    showToast('تعذر تحميل المقاعد من السيرفر.', 'error');
                  }
                }}
                showToast={showToast}
              />
            ) : null}

            {activeView === 'seats' && selectedTrip ? (
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
            ) : null}

            {activeView === 'checkout' && selectedTrip ? (
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
            ) : null}

            {activeView === 'invoice' && currentInvoice ? (
              <InvoiceView invoice={currentInvoice} ticket={viewedTicket} onContinue={() => navigateTo('ticket')} />
            ) : null}

            {activeView === 'main' && activeTab === 'trips' ? (
              <TripsView
                trips={myTrips.map(ensureTicketIdentity)}
                setMyTrips={setMyTrips}
                processRefund={processDelayedRefund}
                pendingCancellationBookingIds={pendingCancellationBookingIds}
                onViewTicket={(ticket) => {
                  setViewedTicket(ensureTicketIdentity(ticket));
                  navigateTo('ticket');
                }}
                showToast={showToast}
              />
            ) : null}

            {activeView === 'ticket' && viewedTicket ? (
              <TicketView ticket={ensureTicketIdentity(viewedTicket)} user={user} onTrack={() => navigateTo('tracking')} showToast={showToast} />
            ) : null}

            {activeView === 'tracking' && viewedTicket ? (
              <TrackingView ticket={ensureTicketIdentity(viewedTicket)} showToast={showToast} openModal={setActiveModal} />
            ) : null}

            {activeView === 'main' && activeTab === 'wallet' ? (
              <WalletView
                userId={userId}
                wallet={wallet}
                setWallet={setWallet}
                transactions={transactions}
                setTransactions={setTransactions}
                showToast={showToast}
                openTopUp={() => setActiveModal('topup')}
                openQrTopUp={() => setActiveModal('topup_qr')}
              />
            ) : null}

            {activeView === 'main' && activeTab === 'profile' ? (
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
                    showToast('تعذر تسجيل الخروج حالياً.', 'error');
                    return;
                  }
                  log.info('logout_succeeded');
                }}
                showToast={showToast}
                openModal={setActiveModal}
                openGuide={openGuide}
              />
            ) : null}
          </div>
        </main>

        {activeView === 'main' ? (
          <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
            <nav className="mx-auto flex max-w-[420px] items-center justify-around rounded-[28px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_45px_-28px_rgba(16,35,63,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/92">
              <BottomNavItem icon={<Home />} label="الرئيسية" active={activeTab === 'home'} onClick={() => navigateTo('main', 'home')} />
              <BottomNavItem icon={<Ticket />} label="رحلاتي" active={activeTab === 'trips'} onClick={() => navigateTo('main', 'trips')} />
              <BottomNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab === 'wallet'} onClick={() => navigateTo('main', 'wallet')} />
              <BottomNavItem icon={<User />} label="حسابي" active={activeTab === 'profile'} onClick={() => navigateTo('main', 'profile')} />
            </nav>
          </div>
        ) : null}
      </div>

      {activeModal === 'courier' ? (
        <CourierModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          showToast={showToast}
        />
      ) : null}

      {activeModal === 'bot' ? <ChatbotModal closeModal={() => setActiveModal(null)} user={user} /> : null}

      {activeModal === 'subs' ? (
        <SubscriptionsModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          subscription={subscription}
          setSubscription={setSubscription}
          showToast={showToast}
        />
      ) : null}

      {activeModal === 'food' ? (
        <FoodOrderModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          showToast={showToast}
        />
      ) : null}

      {activeModal === 'points' ? (
        <PointsModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          points={points}
          setPoints={setPoints}
          showToast={showToast}
        />
      ) : null}

      {activeModal === 'topup' ? (
        <TopUpFlowModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          showToast={showToast}
        />
      ) : null}

      {activeModal === 'notifications' ? (
        <NotificationsModal
          closeModal={() => {
            markAllRead();
            setActiveModal(null);
          }}
          notifications={notifications}
          unreadCount={unreadCount}
          markAllRead={markAllRead}
          clearNotifications={clearNotifications}
          requestBrowserPermission={requestBrowserPermission}
          showToast={showToast}
        />
      ) : null}

      <OnboardingGuide
        isOpen={isGuideOpen}
        onClose={closeGuide}
        onComplete={completeGuide}
      />
    </>
  );
}
