import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Compass,
  Home,
  Menu,
  Moon,
  Ticket,
  User,
  Wallet as WalletIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  cancelBookingAtomic,
  createBookingAtomic,
  holdTripSeats,
  hydrateTripWithSeats,
  searchTripInventory,
} from '../../lib/tripInventory';
import { useCloudAppState } from '../hooks/useCloudAppState';
import { generateTrips, getCancellationPolicy, getLocalDateInputValue } from '../utils/travel';
import ToastStack from './ToastStack';
import { BottomNavItem, DesktopNavItem } from './ui/AppPrimitives';
import { AppLogo, GlassCard, SoftBadge, cn } from './ui/Taree2yUI';
import ChatbotModal from '../modals/ChatbotModal';
import CourierModal from '../modals/CourierModal';
import FoodOrderModal from '../modals/FoodOrderModal';
import PointsModal from '../modals/PointsModal';
import SubscriptionsModal from '../modals/SubscriptionsModal';
import TopUpFlowModal from '../modals/TopUpFlowModal';
import CheckoutView from '../screens/CheckoutView';
import HomeView from '../screens/HomeView';
import InvoiceView from '../screens/InvoiceView';
import ProfileView from '../screens/ProfileView';
import SearchResultsView from '../screens/SearchResultsView';
import SeatSelectionView from '../screens/SeatSelectionView';
import TicketView from '../screens/TicketView';
import TrackingView from '../screens/TrackingView';
import TripsView from '../screens/TripsView';
import WalletView from '../screens/WalletView';

const buildInvoiceItems = ({ passengers, baseTotal, luggageFee, rideFee, autoDiscount, promoDiscount }) => [
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

const viewMeta = {
  home: { title: 'الرئيسية', subtitle: 'احجز رحلتك أو اطلب أي خدمة سفر من طريقي.' },
  search: { title: 'نتايج البحث', subtitle: 'اختر أنسب رحلة حسب السعر والوقت والإتاحة.' },
  seats: { title: 'اختيار المقاعد', subtitle: 'ثبّت أماكنك قبل الدفع واحجز براحتك.' },
  checkout: { title: 'الدفع والتأكيد', subtitle: 'راجع طلبك وكمّل الدفع من محفظة طريقي.' },
  invoice: { title: 'تم الدفع', subtitle: 'فاتورتك جاهزة وبعدها تقدر تشوف التذكرة.' },
  ticket: { title: 'التذكرة', subtitle: 'التذكرة الرقمية الخاصة برحلتك جاهزة للعرض.' },
  tracking: { title: 'تتبع الرحلة', subtitle: 'اعرف الرحلة وصلت لفين بشكل حيّ حسب الجدول.' },
  trips: { title: 'تذاكري', subtitle: 'كل رحلاتك الحالية والسابقة في مكان واحد.' },
  wallet: { title: 'المحفظة', subtitle: 'شحن تجريبي وسجل كامل لكل العمليات.' },
  profile: { title: 'حسابي', subtitle: 'إعداداتك ونقاطك وباقاتك كلها هنا.' },
};

export default function UserApp({ userId, profile, isDark, setIsDark }) {
  const todayDate = getLocalDateInputValue();
  const user = useMemo(
    () => ({ name: profile?.display_name || 'مستخدم', phone: profile?.phone || '' }),
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
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  };

  const navigateTo = (view, tab = activeTab) => {
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
    if (params.from === params.to) return showToast('مكان الانطلاق هو هو مكان الوصول!', 'error');
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
        showToast('شغّلنا البحث الاحتياطي لأن جداول الرحلات لسه ما اتطبقتش بالكامل', 'error');
      }
    } catch (error) {
      console.error('handleSearch error', error);
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
    const subDiscountRate = subscription === 'student' ? 0.15 : subscription === 'vip' ? 0.25 : 0;
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

    const pnr = `TRQ-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
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
        id: `TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        type: 'debit',
        amount: finalTotal,
        date: bookingDate,
        desc: `تذكرة: ${trip.from} - ${trip.to}`,
      },
      ...prev,
    ]);

    return { ok: true, booking: ticket, invoice };
  };

  const finalizeBookingSuccess = (ticket, invoice) => {
    if (String(ticket?.bookingId || ticket?.id || '').startsWith('demo-')) {
      setMyTrips((prev) => [ticket, ...prev]);
    }
    setCurrentInvoice(invoice);
    setViewedTicket(ticket);
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
    if (result?.ok) await refreshCloudState({ silent: true, force: true });
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
      showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة', 'error');
      try {
        setSelectedTrip(await hydrateTripWithSeats(tripArg));
      } catch (_) {
        // noop
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
    if (tripToCancel?.bookingId || tripToCancel?.id) {
      const bookingId = tripToCancel.bookingId || tripToCancel.id;
      if (!String(bookingId).startsWith('demo-')) {
        setMyTrips((prev) =>
          prev.map((trip) => (trip.id === bookingId ? { ...trip, status: 'refund_pending' } : trip)),
        );
        showToast('جاري الإلغاء ومعالجة طلب الاسترداد ⏳', 'success');
        setTimeout(async () => {
          const result = await cancelBookingAtomic({ bookingId });
          if (!result?.ok) {
            showToast(result?.message || 'تعذر إلغاء الحجز', 'error');
            await refreshCloudState({ silent: true, force: true });
            return;
          }
          showToast(`تم الإلغاء! رجعلك ${result.refundAmount} ج.م للمحفظة 💸`, 'success');
          await refreshCloudState({ silent: true, force: true });
        }, 1200);
        return;
      }
    }

    const policy = getCancellationPolicy(tripToCancel);
    if (!policy.allowed) return showToast(policy.message, 'error');
    const refundAmount = policy.refundAmount;
    setMyTrips((prev) =>
      prev.map((trip) => (trip.pnr === tripToCancel.pnr ? { ...trip, status: 'refund_pending' } : trip)),
    );
    showToast('جاري الإلغاء ومعالجة طلب الاسترداد ⏳', 'success');
    setTimeout(() => {
      setMyTrips((currentTrips) => {
        const exists = currentTrips.find((trip) => trip.pnr === tripToCancel.pnr);
        if (exists) {
          setWallet((prev) => prev + refundAmount);
          setTransactions((prev) => [
            {
              id: `REF-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
              type: 'credit',
              amount: refundAmount,
              date: getLocalDateInputValue(),
              desc: `استرداد تذكرة ${tripToCancel.pnr}`,
            },
            ...prev,
          ]);
          showToast(`تم الإلغاء! رجعلك ${refundAmount} ج.م للمحفظة 💸`, 'success');
          return currentTrips.map((trip) =>
            trip.pnr === tripToCancel.pnr
              ? { ...trip, status: 'cancelled', pointsAwarded: false }
              : trip,
          );
        }
        return currentTrips;
      });
    }, 1500);
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
          console.error('taree2yDev.openTrip error', error);
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
              (seat) => seat.status === 'available' || (seat.status === 'held' && seat.heldByCurrentUser),
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
          options.passengers || state.searchParams?.passengers || seatNumbers?.length || 1,
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

  const currentScreenKey =
    activeView === 'main' ? activeTab : activeView;
  const currentMeta = viewMeta[currentScreenKey] || viewMeta.home;
  const walletSummary = `${wallet} ج.م`;

  if (backendLoading) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <GlassCard className="w-full max-w-lg text-center">
          <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin dark:border-indigo-500/20 dark:border-t-indigo-400" />
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            جاري تحميل بياناتك من السحابة...
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            بنجهز محفظتك وتذاكرك وسجل رحلاتك على كل الأجهزة.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <>
      <ToastStack toasts={toasts} />

      <aside
        className={cn(
          'relative z-10 hidden h-full shrink-0 flex-col border-l border-white/70 bg-white/70 p-4 backdrop-blur-2xl transition-all duration-300 md:flex dark:border-slate-800 dark:bg-slate-950/70',
          isSidebarOpen ? 'w-[310px]' : 'w-[104px]',
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <AppLogo compact={!isSidebarOpen} className={isSidebarOpen ? '' : 'justify-center w-full'} />
          {isSidebarOpen ? (
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-300"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {!isSidebarOpen ? (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="mb-4 flex h-12 w-full items-center justify-center rounded-[22px] border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-300"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        {isSidebarOpen ? (
          <GlassCard className="mb-4 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white dark:border-indigo-500/10 dark:bg-gradient-to-br dark:from-indigo-500/90 dark:via-indigo-600/90 dark:to-violet-600/90">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-indigo-100">أهلاً بيك</div>
                <div className="mt-1 text-xl font-black">{user.name}</div>
                <div className="mt-2 text-xs font-bold text-indigo-100/90">
                  طريقي معاك في الحجز، الدفع، التتبع، والخدمات.
                </div>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-white/16 text-2xl font-black">
                {user.name.charAt(0)}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-[20px] bg-white/10 px-3 py-3">
                <div className="text-[11px] font-bold text-indigo-100">المحفظة</div>
                <div className="mt-1 text-lg font-black" dir="ltr">
                  {wallet} ج
                </div>
              </div>
              <div className="rounded-[20px] bg-white/10 px-3 py-3">
                <div className="text-[11px] font-bold text-indigo-100">النقاط</div>
                <div className="mt-1 text-lg font-black" dir="ltr">
                  {points}
                </div>
              </div>
            </div>
          </GlassCard>
        ) : null}

        <nav className="space-y-2.5">
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

        {isSidebarOpen ? (
          <div className="mt-auto space-y-3 pt-4">
            <GlassCard className="bg-slate-50/90 dark:bg-slate-900/85">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">خدمات سريعة</div>
                  <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    اختصارات للحاجات اللي بتستخدمها كتير.
                  </div>
                </div>
                <SoftBadge tone="emerald" text="تجريبي" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveModal('bot')}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300"
                >
                  المساعد
                </button>
                <button
                  onClick={() => setActiveModal('courier')}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300"
                >
                  طرد
                </button>
                <button
                  onClick={() => setActiveModal('subs')}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300"
                >
                  الباقات
                </button>
                <button
                  onClick={() => setActiveModal('topup')}
                  className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300"
                >
                  شحن
                </button>
              </div>
            </GlassCard>
          </div>
        ) : null}
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/50 bg-white/65 px-4 py-3 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/70 md:px-6 xl:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {activeView !== 'main' ? (
                <button
                  onClick={goBack}
                  className="flex h-11 items-center gap-1.5 rounded-[20px] border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-indigo-300"
                >
                  <ChevronRight className="h-4 w-4" />
                  رجوع
                </button>
              ) : (
                <button
                  onClick={() => navigateTo('main', 'home')}
                  className="md:hidden"
                >
                  <AppLogo compact />
                </button>
              )}

              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  طريقي
                </div>
                <h1 className="truncate text-lg font-black text-slate-900 dark:text-white md:text-[1.7rem]">
                  {currentMeta.title}
                </h1>
                <p className="hidden truncate text-xs font-bold text-slate-500 dark:text-slate-400 md:block">
                  {currentMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setIsDark(!isDark)}
                className="hidden h-11 w-11 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-300 md:flex"
                title="الوضع الليلي"
              >
                <Moon className="h-5 w-5" />
              </button>

              <button
                onClick={() => navigateTo('main', 'wallet')}
                className="flex items-center gap-2 rounded-[20px] border border-indigo-200 bg-indigo-50 px-3 py-2 text-right transition hover:border-indigo-300 dark:border-indigo-500/20 dark:bg-indigo-500/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
                  <WalletIcon className="h-4 w-4" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                    المحفظة
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                    {walletSummary}
                  </div>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white sm:hidden" dir="ltr">
                  {wallet} ج
                </div>
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar md:hidden">
            <SoftBadge tone="indigo" icon={<Compass className="h-3.5 w-3.5" />} text={currentMeta.subtitle} />
            <SoftBadge tone="emerald" text={`${myTrips.length} رحلة`} />
            <SoftBadge tone="amber" text={`${points} نقطة`} />
          </div>
        </header>

        <main className="hide-scrollbar relative flex-1 overflow-y-auto">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.05),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_38%)]" />
          <div className="relative mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-4 pb-28 pt-4 md:px-6 md:pb-8 md:pt-5 xl:px-8">
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
                    console.error('load seats error', error);
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
              <TrackingView ticket={viewedTicket} showToast={showToast} openModal={setActiveModal} />
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
                  await supabase.auth.signOut();
                }}
                showToast={showToast}
                openModal={setActiveModal}
              />
            )}
          </div>
        </main>

        {activeView === 'main' && (
          <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-40 md:hidden">
            <nav className="pointer-events-auto mx-auto flex max-w-lg items-center justify-between rounded-[28px] border border-white/70 bg-white/90 p-2 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-slate-700 dark:bg-slate-900/92">
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
      {activeModal === 'bot' && <ChatbotModal closeModal={() => setActiveModal(null)} user={user} />}
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
