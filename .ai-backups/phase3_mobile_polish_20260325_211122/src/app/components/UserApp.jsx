import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Bell,
  BusFront,
  ChevronRight,
  Crown,
  Home,
  Menu,
  Search,
  Ticket,
  User,
  Wallet as WalletIcon,
} from 'lucide-react';
import { createLogger, isMissingRpcError } from '../../lib/logger';
import {
  applyReferralCode as applyReferralCodeRpc,
  getReferralCodeFromUrl,
  getReferralSummary,
  recordCampaignEvent,
} from '../../lib/engagement';
import { markOfferPopupSeen } from '../../lib/account';
import { signOutCurrentUser } from '../../lib/auth';
import { getPromoPopupOffer } from '../../lib/promoEngine';
import { useCloudAppState } from '../hooks/useCloudAppState';
import { useTripNotifications } from '../hooks/useTripNotifications';
import {
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
import { EmptyStateCard } from './ui/StateBlocks';
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
import RewardsView from '../screens/RewardsView';
import SubscriptionsView from '../screens/SubscriptionsView';
import TicketsHubView from '../screens/TicketsHubView';
import ProfileView from '../screens/ProfileView';
import TopUpFlowModal from '../modals/TopUpFlowModal';
import PointsModal from '../modals/PointsModal';
import SubscriptionsModal from '../modals/SubscriptionsModal';
import ChatbotModal from '../modals/ChatbotModal';
import WalletQrModal from '../modals/WalletQrModal';
import NotificationsModal from '../modals/NotificationsModal';
import PromoOfferModal from '../modals/PromoOfferModal';
import InternalOpsPanel from './internal/InternalOpsPanel';

const log = createLogger('user-app');

const buildInvoiceItems = ({
  passengers,
  baseTotal,
  luggageFee,
  autoDiscount,
  promoDiscount,
}) => [
  { name: `تذاكر (${passengers})`, price: baseTotal },
  ...(luggageFee > 0 ? [{ name: 'وزن إضافي', price: luggageFee }] : []),
  ...(autoDiscount > 0 ? [{ name: 'خصم الباقة', price: -autoDiscount }] : []),
  ...(promoDiscount > 0 ? [{ name: 'كود خصم', price: -promoDiscount }] : []),
];

const formatCancellationErrorMessage = (result) => {
  if (!result) {
    return 'تعذر إلغاء الحجز حالياً.';
  }

  if (result.errorClass === 'missing_rpc' || isMissingRpcError(result, 'cancel_booking_atomic')) {
    return 'ميزة الإلغاء غير متاحة حالياً. لم يتم إجراء أي تغيير على الحجز.';
  }

  return result.message || 'تعذر إلغاء الحجز حالياً.';
};

const getHeaderContent = (activeView, activeTab) => {
  if (activeView === 'search') return { title: 'البحث', subtitle: 'قارن بين الوقت والسعر والإتاحة' };
  if (activeView === 'seats') return { title: 'اختيار المقاعد', subtitle: 'حدد المقاعد قبل مراجعة الدفع' };
  if (activeView === 'checkout') return { title: 'الدفع والتأكيد', subtitle: 'راجع كل شيء قبل الحجز النهائي' };
  if (activeView === 'invoice') return { title: 'تم الحجز', subtitle: 'التذكرة جاهزة دلوقتي' };
  if (activeView === 'ticket') return { title: 'التذكرة', subtitle: 'الوصول السريع للتذكرة والـ QR' };
  if (activeView === 'tracking') return { title: 'متابعة الرحلة', subtitle: 'راجع حالة الرحلة الحالية' };
  if (activeTab === 'bookings') return { title: 'رحلاتي', subtitle: 'الإدارة الكاملة للحجوزات' };
  if (activeTab === 'tickets') return { title: 'التذاكر', subtitle: 'الوصول السريع للتذاكر' };
  if (activeTab === 'wallet') return { title: 'المحفظة', subtitle: 'الرصيد والحركات' };
  if (activeTab === 'rewards') return { title: 'المكافآت', subtitle: 'النقاط والدعوات والعروض' };
  if (activeTab === 'subscriptions') return { title: 'الاشتراكات', subtitle: 'الباقات والمزايا' };
  if (activeTab === 'profile') return { title: 'الحساب', subtitle: 'الملف الشخصي والإعدادات' };
  return { title: 'طريقي', subtitle: 'حجز أوضح وتجربة أنظف' };
};

function readInternalOpsEnabled() {
  if (String(import.meta.env.VITE_ENABLE_INTERNAL_OPS || '').toLowerCase() === 'true') {
    return true;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('ops') === '1';
  } catch {
    return false;
  }
}

const mainTabPaths = {
  home: '/home',
  bookings: '/bookings',
  tickets: '/tickets',
  wallet: '/wallet',
  rewards: '/rewards',
  subscriptions: '/subscriptions',
  profile: '/profile',
};

function buildAppPath(view, tab = 'home') {
  if (view === 'main') return mainTabPaths[tab] || '/home';
  if (view === 'search') return '/search';
  if (view === 'seats') return '/seats';
  if (view === 'checkout') return '/payment';
  if (view === 'invoice') return '/booking-success';
  if (view === 'ticket') return '/tickets/view';
  if (view === 'tracking') return '/trip-status';
  return '/home';
}

function resolveAppPath(pathname = '/home') {
  const normalized = String(pathname || '/home').replace(/\/+$/, '') || '/';

  switch (normalized) {
    case '/':
    case '/home':
      return { view: 'main', tab: 'home' };
    case '/search':
      return { view: 'search', tab: 'home' };
    case '/seats':
      return { view: 'seats', tab: 'home' };
    case '/payment':
      return { view: 'checkout', tab: 'home' };
    case '/booking-success':
      return { view: 'invoice', tab: 'home' };
    case '/bookings':
      return { view: 'main', tab: 'bookings' };
    case '/tickets':
      return { view: 'main', tab: 'tickets' };
    case '/tickets/view':
      return { view: 'ticket', tab: 'tickets' };
    case '/trip-status':
      return { view: 'tracking', tab: 'tickets' };
    case '/wallet':
      return { view: 'main', tab: 'wallet' };
    case '/rewards':
      return { view: 'main', tab: 'rewards' };
    case '/subscriptions':
      return { view: 'main', tab: 'subscriptions' };
    case '/profile':
      return { view: 'main', tab: 'profile' };
    default:
      return { view: 'main', tab: 'home' };
  }
}

function pickLatestUpcomingTrip(trips = []) {
  const preparedTrips = Array.isArray(trips) ? trips.filter(Boolean) : [];
  const statuses = ['upcoming', 'refund_pending', 'past', 'cancelled'];

  return preparedTrips
    .slice()
    .sort((tripA, tripB) => {
      const statusOrder = statuses.indexOf(tripA?.status || 'upcoming') - statuses.indexOf(tripB?.status || 'upcoming');
      if (statusOrder !== 0) return statusOrder;

      const dateA = new Date(`${tripA?.date || '2999-12-31'}T${tripA?.departureTime || '23:59'}:00`).getTime();
      const dateB = new Date(`${tripB?.date || '2999-12-31'}T${tripB?.departureTime || '23:59'}:00`).getTime();
      return dateA - dateB;
    })[0] || null;
}

export default function UserApp({
  userId,
  profile,
  refreshProfile,
  authWarning = '',
  isDark,
  setIsDark,
  runtimeMode = 'supabase',
}) {
  const todayDate = getLocalDateInputValue();
  const user = useMemo(
    () => ({
      name: profile?.display_name || 'مستخدم',
      phone: profile?.phone || '',
      email: profile?.email || '',
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

  const initialRoute = useMemo(
    () => resolveAppPath(typeof window !== 'undefined' ? window.location.pathname : '/home'),
    [],
  );

  const [activeTab, setActiveTab] = useState(initialRoute.tab || 'home');
  const [activeView, setActiveView] = useState(initialRoute.view || 'main');
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
  const [ticketParentTab, setTicketParentTab] = useState(initialRoute.tab === 'bookings' ? 'bookings' : 'tickets');
  const [walletQrInitialAmount, setWalletQrInitialAmount] = useState(null);
  const [pendingCancellationBookingIds, setPendingCancellationBookingIds] = useState([]);
  const [promoPopupOffer, setPromoPopupOffer] = useState(null);
  const [promoHighlights, setPromoHighlights] = useState([]);
  const [referralSummary, setReferralSummary] = useState(null);
  const [internalOpsEnabled] = useState(readInternalOpsEnabled);
  const shownAuthWarningRef = useRef('');
  const promoHighlightImpressionsRef = useRef(new Set());
  const promoPopupImpressionsRef = useRef(new Set());
  const dismissedPromoPopupRef = useRef(new Set());
  const appliedReferralCodesRef = useRef(new Set());
  const referralCodeFromUrl = useMemo(() => getReferralCodeFromUrl(), []);

  const { isGuideOpen, openGuide, closeGuide, completeGuide } = useOnboardingGuide({
    userId,
    profile,
    onProfileUpdated: async () => {
      await refreshProfile?.();
    },
  });

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

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = resolveAppPath(window.location.pathname);
      setActiveView(nextRoute.view || 'main');
      setActiveTab(nextRoute.tab || 'home');
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (msg, type = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (!authWarning) return;
    if (shownAuthWarningRef.current === authWarning) return;

    shownAuthWarningRef.current = authWarning;
    showToast(authWarning, 'error');
  }, [authWarning]);

  const {
    notifications,
    unreadCount,
    markAllRead,
    clearNotifications,
    requestBrowserPermission,
  } = useTripNotifications({
    userId,
    trips: myTrips,
    onNotify: (entry) => showToast(entry.title, 'success'),
  });

  const promoContext = useMemo(
    () => ({
      from: selectedTrip?.from || searchParams.from || '',
      to: selectedTrip?.to || searchParams.to || '',
      passengers: searchParams.passengers || 1,
      activeView,
      activeTab,
    }),
    [
      selectedTrip?.from,
      selectedTrip?.to,
      searchParams.from,
      searchParams.to,
      searchParams.passengers,
      activeView,
      activeTab,
    ],
  );

  const refreshReferralSummary = useCallback(async () => {
    if (!userId) {
      setReferralSummary(null);
      return null;
    }

    const summary = await getReferralSummary({ userId });
    setReferralSummary(summary);
    return summary;
  }, [userId]);

  const handleApplyReferralCode = async (code) => {
    const result = await applyReferralCodeRpc({ userId, code });
    if (result?.message) {
      showToast(result.message, result.ok ? 'success' : 'error');
    }
    await refreshReferralSummary();
    return result;
  };

  const handlePromoHighlightInteraction = (offer, action = 'opened') => {
    if (!userId || !offer?.campaignId) return;

    recordCampaignEvent({
      userId,
      campaignId: offer.campaignId,
      eventName: action === 'copied' ? 'offer_highlight_copied' : 'offer_highlight_opened',
      source: 'home_highlight',
      metadata: {
        code: offer.code || '',
        triggerKind: offer.triggerKind || '',
      },
    });
  };

  useEffect(() => {
    let active = true;

    if (!userId) {
      setReferralSummary(null);
      return () => {
        active = false;
      };
    }

    (async () => {
      const summary = await getReferralSummary({ userId });
      if (!active) return;
      setReferralSummary(summary);

      const pendingCode = referralCodeFromUrl;
      if (!pendingCode || summary?.canApplyCode === false) return;
      if (appliedReferralCodesRef.current.has(`${userId}:${pendingCode}`)) return;

      appliedReferralCodesRef.current.add(`${userId}:${pendingCode}`);
      const result = await applyReferralCodeRpc({ userId, code: pendingCode });
      if (!active) return;

      if (result?.message) {
        showToast(result.message, result.ok ? 'success' : 'error');
      }

      const refreshed = await getReferralSummary({ userId });
      if (active) {
        setReferralSummary(refreshed);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, myTrips.length, referralCodeFromUrl]);

  useEffect(() => {
    let active = true;

    const loadOffer = async () => {
      if (!userId || !profile?.onboarding_completed_at) {
        setPromoHighlights([]);
        return;
      }

      const offer = await getPromoPopupOffer({ userId, context: promoContext });
      if (!active) return;

      if (!offer) {
        setPromoHighlights([]);
        return;
      }

      const nextHighlights = offer.highlightEnabled === false ? [] : [offer];
      setPromoHighlights(nextHighlights);

      nextHighlights.forEach((entry) => {
        const impressionKey = entry.campaignId || entry.code || entry.title;
        if (!impressionKey || promoHighlightImpressionsRef.current.has(impressionKey)) return;
        promoHighlightImpressionsRef.current.add(impressionKey);
        if (entry.campaignId) {
          recordCampaignEvent({
            userId,
            campaignId: entry.campaignId,
            eventName: 'offer_highlight_impression',
            source: 'home_highlight',
            metadata: {
              code: entry.code || '',
              triggerKind: entry.triggerKind || '',
            },
          });
        }
      });

      if (!offer.popupEnabled) {
        return;
      }

      const popupKey = offer.campaignId || offer.code || offer.title || 'popup';
      if (dismissedPromoPopupRef.current.has(`${userId}:${popupKey}`)) {
        return;
      }

      if (offer.popupEnabled && !activeModal && !isGuideOpen) {
        setPromoPopupOffer(offer);
        setActiveModal('promo_offer');

        if (!promoPopupImpressionsRef.current.has(popupKey) && offer.campaignId) {
          promoPopupImpressionsRef.current.add(popupKey);
          recordCampaignEvent({
            userId,
            campaignId: offer.campaignId,
            eventName: 'offer_popup_shown',
            source: 'promo_modal',
            metadata: {
              code: offer.code || '',
              triggerKind: offer.triggerKind || '',
            },
          });
        }
      }
    };

    const timeoutId = window.setTimeout(loadOffer, 1200);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [userId, profile?.onboarding_completed_at, activeModal, isGuideOpen, promoContext]);
  const dismissPromoOffer = async () => {
    const popupKey = promoPopupOffer?.campaignId || promoPopupOffer?.code || promoPopupOffer?.title || 'popup';
    if (userId) {
      dismissedPromoPopupRef.current.add(`${userId}:${popupKey}`);
    }

    if (userId && promoPopupOffer?.campaignId) {
      recordCampaignEvent({
        userId,
        campaignId: promoPopupOffer.campaignId,
        eventName: 'offer_dismissed',
        source: 'promo_modal',
        metadata: { code: promoPopupOffer.code || '' },
      });
    }

    setPromoPopupOffer(null);

    if (userId) {
      await markOfferPopupSeen(userId);
      await refreshProfile?.();
    }
  };

  const navigateTo = (view, tab = activeTab, options = {}) => {
    const { replace = false, parentTab } = options;

    log.debug('navigate', {
      fromView: activeView,
      toView: view,
      fromTab: activeTab,
      toTab: tab,
      replace,
    });

    if (parentTab) {
      setTicketParentTab(parentTab);
    }

    setActiveView(view);
    setActiveTab(tab);

    if (typeof window !== 'undefined') {
      const nextPath = buildAppPath(view, tab);
      const currentPath = `${window.location.pathname || '/'}${window.location.search || ''}`;
      if (currentPath !== nextPath) {
        const method = replace ? 'replaceState' : 'pushState';
        window.history[method]({}, '', nextPath);
      }
      window.scrollTo(0, 0);
    }
  };

  const goBack = () => {
    if (activeView === 'invoice') navigateTo('main', 'tickets', { replace: true });
    else if (activeView === 'checkout') navigateTo('seats', activeTab, { replace: true });
    else if (activeView === 'seats') navigateTo('search', activeTab, { replace: true });
    else if (activeView === 'search') navigateTo('main', 'home', { replace: true });
    else if (activeView === 'ticket') navigateTo('main', ticketParentTab || 'tickets', { replace: true });
    else if (activeView === 'tracking') navigateTo('ticket', ticketParentTab || 'tickets', { replace: true });
    else navigateTo('main', 'home', { replace: true });
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

      const authoritativeTrips = Array.isArray(results?.trips)
        ? results.trips.filter((trip) => String(trip?.instanceId || '').trim())
        : [];

      const hasFallbackSource = String(results?.source || '')
        .toLowerCase()
        .includes('fallback');

      const hasNonAuthoritativeTrips = Array.isArray(results?.trips)
        ? results.trips.some((trip) => !String(trip?.instanceId || '').trim())
        : false;

      if (hasFallbackSource || hasNonAuthoritativeTrips) {
        log.error('non_authoritative_search_blocked', {
          from: params.from,
          to: params.to,
          date: params.date,
          passengers: params.passengers,
          source: results?.source || null,
          returnedTrips: Array.isArray(results?.trips) ? results.trips.length : 0,
          authoritativeTrips: authoritativeTrips.length,
        });

        setSearchResults({
          trips: [],
          isDirect: Boolean(results?.isDirect ?? true),
        });
        showToast('تعذر تحميل رحلات صالحة من السيرفر حالياً. حاول مرة تانية بعد قليل.', 'error');
        return;
      }

      setSearchResults({
        ...results,
        trips: authoritativeTrips,
      });
    } catch (error) {
      log.error('search_failed', {
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
        error,
      });

      setSearchResults({
        trips: [],
        isDirect: true,
      });
      showToast('تعذر تحميل الرحلات من السيرفر حالياً. حاول مرة تانية بعد قليل.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const createDemoBookingResult = ({
    trip,
  }) => {
    log.error('demo_booking_blocked_in_production', {
      tripId: trip?.id || null,
      tripInstanceId: trip?.instanceId || null,
    });

    return {
      ok: false,
      code: 'backend_trip_required',
      message: 'لا يمكن إكمال الحجز على هذه الرحلة الآن. اختر رحلة أخرى متاحة.',
    };
  };

  const finalizeBookingSuccess = (ticket, invoice) => {
    const normalizedTicket = ensureTicketIdentity(ticket);

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
    promoDiscountAmount: _promoDiscountAmount = 0,
    hasLuggage,
    needsAccess,
  }) => {
    if (!trip?.instanceId) {
      return {
        ok: false,
        code: 'backend_trip_required',
        message: 'لا يمكن إكمال الحجز على هذه الرحلة الآن. اختر رحلة أخرى متاحة.',
      };
    }

    const result = await createBookingAtomic({
      tripInstanceId: trip.instanceId,
      seatNumbers,
      passengers,
      promoCode,
      hasLuggage,
      rideToStation: false,
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
      const result = {
        ok: false,
        code: 'backend_trip_required',
        message: 'اختيار المقاعد غير متاح على هذه الرحلة حالياً.',
      };
      showToast(result.message, 'error');
      return result;
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

    if (!bookingId) {
      return showToast('الإلغاء غير متاح على هذا الحجز حالياً.', 'error');
    }

    setPendingCancellationBookingIds((prev) =>
      prev.includes(bookingId) ? prev : [...prev, bookingId],
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
        await wait();
        return {
          ok: false,
          code: 'backend_required',
          amount: numericAmount,
          message:
            'تم تعطيل شحن QA المحلي بعد Phase 6.5. استخدم شحن حقيقي أو mutation حقيقية على الباك إند.',
          description: desc,
        };
      },
      async resetDemoState() {
        setSelectedTrip(null);
        setSelectedSeats([]);
        setCurrentInvoice(null);
        setViewedTicket(null);
        navigateTo('main', 'home');

        try {
          await refreshCloudState({ silent: true, force: true });
        } catch (error) {
          log.warn('qa_reset_refresh_failed', { error });
        }

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
        navigateTo('main', 'bookings');
        await wait();
        return 'bookings';
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
          promoDiscountAmount: Number(options.promoDiscountAmount || 0),
          hasLuggage: Boolean(options.hasLuggage),
          needsAccess: Boolean(options.needsAccess),
        });
        if (result?.ok) {
          finalizeBookingSuccess(result.booking, result.invoice);
          await wait(150);
        }
        return result;
      },
      async continueToTicket() {
        navigateTo('ticket', 'tickets');
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

  const latestTrip = pickLatestUpcomingTrip(Array.isArray(myTrips) ? myTrips : [])
    ? ensureTicketIdentity(pickLatestUpcomingTrip(Array.isArray(myTrips) ? myTrips : []))
    : null;

  const headerContent = getHeaderContent(activeView, activeTab);

  return (
    <>
      <ToastStack toasts={toasts} />


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
          <div className="space-y-2">
            <p className={`px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 ${isSidebarOpen ? '' : 'text-center'}`}>التنقل</p>
            <DesktopNavItem icon={<Home />} label="الرئيسية" active={activeTab === 'home'} onClick={() => navigateTo('main', 'home')} collapsed={!isSidebarOpen} />
            <DesktopNavItem icon={<Search />} label="البحث" active={activeView === 'search'} onClick={() => navigateTo('search', activeTab)} collapsed={!isSidebarOpen} />
            <DesktopNavItem icon={<Ticket />} label="رحلاتي" active={activeTab === 'bookings'} onClick={() => navigateTo('main', 'bookings')} collapsed={!isSidebarOpen} />
            <DesktopNavItem icon={<Ticket />} label="التذاكر" active={activeTab === 'tickets'} onClick={() => navigateTo('main', 'tickets')} collapsed={!isSidebarOpen} />
          </div>
          <div className="mt-4 space-y-2">
            <p className={`px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 ${isSidebarOpen ? '' : 'text-center'}`}>الحساب والمزايا</p>
            <DesktopNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab === 'wallet'} onClick={() => navigateTo('main', 'wallet')} collapsed={!isSidebarOpen} />
            <DesktopNavItem icon={<Award />} label="المكافآت" active={activeTab === 'rewards'} onClick={() => navigateTo('main', 'rewards')} collapsed={!isSidebarOpen} />
            <DesktopNavItem icon={<Crown />} label="الاشتراكات" active={activeTab === 'subscriptions'} onClick={() => navigateTo('main', 'subscriptions')} collapsed={!isSidebarOpen} />
            <DesktopNavItem icon={<User />} label="الحساب" active={activeTab === 'profile'} onClick={() => navigateTo('main', 'profile')} collapsed={!isSidebarOpen} />
          </div>
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
              {internalOpsEnabled ? (
                <button
                  type="button"
                  onClick={() => setActiveModal('internal_ops')}
                  className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/40 md:inline-flex"
                >
                  OPS
                </button>
              ) : null}
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
                isFirstTimeUser={Boolean(profile?.isFirstTimeUser)}
                latestTrip={latestTrip}
                wallet={wallet}
                points={points}
                unreadCount={unreadCount}
                subscription={subscription}
                onOpenLatestTicket={() => {
                  if (!latestTrip) return;
                  setViewedTicket(ensureTicketIdentity(latestTrip));
                  setTicketParentTab('bookings');
                  navigateTo('ticket', 'tickets');
                }}
                onOpenBookings={() => navigateTo('main', 'bookings')}
                onOpenTickets={() => navigateTo('main', 'tickets')}
                onOpenWallet={() => navigateTo('main', 'wallet')}
                onOpenRewards={() => navigateTo('main', 'rewards')}
                onOpenSubscriptions={() => navigateTo('main', 'subscriptions')}
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
                    navigateTo('seats', activeTab);
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
                onGoHome={() => navigateTo('main', 'home')}
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
                userId={userId}
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
              <InvoiceView invoice={currentInvoice} ticket={viewedTicket} onContinue={() => navigateTo('ticket', 'tickets')} />
            ) : null}

            {activeView === 'main' && activeTab === 'bookings' ? (
              <TripsView
                trips={myTrips.map(ensureTicketIdentity)}
                setMyTrips={setMyTrips}
                processRefund={processDelayedRefund}
                pendingCancellationBookingIds={pendingCancellationBookingIds}
                onViewTicket={(ticket) => {
                  setViewedTicket(ensureTicketIdentity(ticket));
                  setTicketParentTab('bookings');
                  navigateTo('ticket', 'tickets');
                }}
                onTrackTrip={(ticket) => {
                  setViewedTicket(ensureTicketIdentity(ticket));
                  setTicketParentTab('bookings');
                  navigateTo('tracking', 'tickets');
                }}
                showToast={showToast}
              />
            ) : null}

            {activeView === 'main' && activeTab === 'tickets' ? (
              <TicketsHubView
                trips={myTrips.map(ensureTicketIdentity)}
                pendingCancellationBookingIds={pendingCancellationBookingIds}
                onOpenTicket={(ticket) => {
                  setViewedTicket(ensureTicketIdentity(ticket));
                  setTicketParentTab('tickets');
                  navigateTo('ticket', 'tickets');
                }}
                onTrackTicket={(ticket) => {
                  setViewedTicket(ensureTicketIdentity(ticket));
                  setTicketParentTab('tickets');
                  navigateTo('tracking', 'tickets');
                }}
              />
            ) : null}

            {activeView === 'ticket' ? (
              viewedTicket ? (
                <TicketView ticket={ensureTicketIdentity(viewedTicket)} user={user} onTrack={() => navigateTo('tracking', 'tickets')} showToast={showToast} />
              ) : (
                <EmptyStateCard
                  title="اختَر تذكرة أولاً"
                  text="افتح صفحة التذاكر أو رحلاتي، ثم اختر التذكرة التي تريد عرضها."
                  actionLabel="صفحة التذاكر"
                  onAction={() => navigateTo('main', 'tickets')}
                />
              )
            ) : null}

            {activeView === 'tracking' ? (
              viewedTicket ? (
                <TrackingView ticket={ensureTicketIdentity(viewedTicket)} showToast={showToast} />
              ) : (
                <EmptyStateCard
                  title="اختَر رحلة أولاً"
                  text="افتح تذكرة رحلة قادمة ثم استخدم متابعة الرحلة من هناك."
                  actionLabel="صفحة التذاكر"
                  onAction={() => navigateTo('main', 'tickets')}
                />
              )
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
                openWalletQr={() => {
                  setWalletQrInitialAmount(null);
                  setActiveModal('wallet_qr');
                }}
              />
            ) : null}

            {activeView === 'main' && activeTab === 'rewards' ? (
              <RewardsView
                points={points}
                subscription={subscription}
                referralSummary={referralSummary}
                refreshReferralSummary={refreshReferralSummary}
                applyReferralCode={handleApplyReferralCode}
                showToast={showToast}
                openPoints={() => setActiveModal('points')}
                openSubscriptions={() => navigateTo('main', 'subscriptions')}
                promoHighlights={promoHighlights}
                onPromoSearch={(routeParams) =>
                  handleSearch({
                    ...routeParams,
                    date: routeParams?.date || searchParams.date || getLocalDateInputValue(),
                    passengers: routeParams?.passengers || searchParams.passengers || 1,
                  })
                }
              />
            ) : null}

            {activeView === 'main' && activeTab === 'subscriptions' ? (
              <SubscriptionsView
                wallet={wallet}
                subscription={subscription}
                onManageSubscription={() => setActiveModal('subs')}
              />
            ) : null}

            {activeView === 'main' && activeTab === 'profile' ? (
              <ProfileView
                user={user}
                profile={profile}
                isDark={isDark}
                setIsDark={setIsDark}
                refreshProfile={refreshProfile}
                onLogout={async () => {
                  const result = await signOutCurrentUser();

                  if (!result?.ok) {
                    log.error('logout_failed', { error: result?.error || null });
                  } else {
                    log.info('logout_succeeded', {
                      usedLocalFallback: Boolean(result.usedLocalFallback),
                    });
                  }

                  return result;
                }}
                showToast={showToast}
                openModal={setActiveModal}
                openGuide={openGuide}
              />
            ) : null}
          </div>
        </main>

        {['main', 'search'].includes(activeView) ? (
          <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
            <nav className="mx-auto flex max-w-[420px] items-center justify-around rounded-[28px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_45px_-28px_rgba(16,35,63,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/92">
              <BottomNavItem icon={<Home />} label="الرئيسية" active={activeTab === 'home'} onClick={() => navigateTo('main', 'home')} />
              <BottomNavItem icon={<Search />} label="البحث" active={activeView === 'search'} onClick={() => navigateTo('search', activeTab)} />
              <BottomNavItem icon={<Ticket />} label="رحلاتي" active={activeTab === 'bookings'} onClick={() => navigateTo('main', 'bookings')} />
              <BottomNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab === 'wallet'} onClick={() => navigateTo('main', 'wallet')} />
              <BottomNavItem icon={<User />} label="الحساب" active={activeTab === 'profile'} onClick={() => navigateTo('main', 'profile')} />
            </nav>
          </div>
        ) : null}
      </div>

      {activeModal === 'help' ? <ChatbotModal closeModal={() => setActiveModal(null)} user={user} /> : null}

      {activeModal === 'subs' ? (
        <SubscriptionsModal
          closeModal={() => setActiveModal(null)}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          subscription={subscription}
          setSubscription={setSubscription}
          showToast={showToast}
          runtimeMode={runtimeMode}
          refreshCloudState={refreshCloudState}
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
          runtimeMode={runtimeMode}
          refreshCloudState={refreshCloudState}
        />
      ) : null}

      {activeModal === 'wallet_qr' ? (
        <WalletQrModal
          closeModal={() => {
            setWalletQrInitialAmount(null);
            setActiveModal(null);
          }}
          userId={userId}
          initialAmount={walletQrInitialAmount}
          showToast={showToast}
        />
      ) : null}

      {activeModal === 'topup' ? (
        <TopUpFlowModal
          closeModal={() => setActiveModal(null)}
          userId={userId}
          wallet={wallet}
          setWallet={setWallet}
          setTransactions={setTransactions}
          showToast={showToast}
          runtimeMode={runtimeMode}
          openWalletQr={(amount) => {
            setWalletQrInitialAmount(amount || null);
            setActiveModal('wallet_qr');
          }}
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

      {activeModal === 'promo_offer' ? (
        <PromoOfferModal
          offer={promoPopupOffer}
          closeModal={() => setActiveModal(null)}
          showToast={showToast}
          onDismiss={dismissPromoOffer}
          onCopyOffer={(offer) => {
            if (!userId || !offer?.campaignId) return;
            recordCampaignEvent({
              userId,
              campaignId: offer.campaignId,
              eventName: 'offer_copied',
              source: 'promo_modal',
              metadata: { code: offer.code || '' },
            });
          }}
        />
      ) : null}

      {activeModal === 'internal_ops' && internalOpsEnabled ? (
        <InternalOpsPanel
          closeModal={() => setActiveModal(null)}
          userId={userId}
          user={user}
          wallet={wallet}
          points={points}
          subscription={subscription}
          latestTrip={latestTrip}
          onRefresh={refreshCloudState}
          onOpenLatestTicket={() => {
            if (!latestTrip) return;
            setViewedTicket(ensureTicketIdentity(latestTrip));
            setActiveModal(null);
            navigateTo('ticket', 'tickets');
          }}
          onOpenLatestTracking={() => {
            if (!latestTrip) return;
            setViewedTicket(ensureTicketIdentity(latestTrip));
            setActiveModal(null);
            navigateTo('tracking', 'tickets');
          }}
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

