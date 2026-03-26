import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Compass,
  HelpCircle,
  Home,
  Menu,
  Moon,
  QrCode,
  Route,
  Sun,
  User,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';
import { createLogger, isMissingRpcError } from '../../lib/logger';
import {
  applyReferralCode as applyReferralCodeRpc,
  clearPendingReferralCode,
  getReferralCodeFromUrl,
  getReferralSummary,
  readPendingReferralCode,
  recordCampaignEvent,
  stashPendingReferralCode,
} from '../../lib/engagement';
import { markOfferPopupSeen } from '../../lib/account';
import { signOutCurrentUser } from '../../lib/auth';
import { getPromoPopupOffer } from '../../lib/promoEngine';
import { useCloudAppState } from '../hooks/useCloudAppState';
import { useTripNotifications } from '../hooks/useTripNotifications';
import { getLocalDateInputValue } from '../utils/travel';
import { ensureTicketIdentity } from '../utils/tripIdentity';
import {
  createBookingAtomic,
  holdTripSeats,
  hydrateTripWithSeats,
  searchTripInventory,
} from '../../lib/tripInventory';
import { cancelBookingAtomicCompat } from '../../lib/cancelBookingCompat';
import { useOnboardingGuide } from '../hooks/useOnboardingGuide';
import { BottomNavItem, MetaChip } from './ui/AppPrimitives';
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
import TicketsHubView from '../screens/TicketsHubView';
import TopUpFlowModal from '../modals/TopUpFlowModal';
import PointsModal from '../modals/PointsModal';
import SubscriptionsModal from '../modals/SubscriptionsModal';
import ChatbotModal from '../modals/ChatbotModal';
import WalletQrModal from '../modals/WalletQrModal';
import NotificationsModal from '../modals/NotificationsModal';
import PromoOfferModal from '../modals/PromoOfferModal';
import InternalOpsPanel from './internal/InternalOpsPanel';

const log = createLogger('user-app');

const ROUTE_TO_STATE = {
  '/': { view: 'main', page: 'home' },
  '/home': { view: 'main', page: 'home' },
  '/bookings': { view: 'main', page: 'bookings' },
  '/tickets': { view: 'main', page: 'tickets' },
  '/wallet': { view: 'main', page: 'wallet' },
  '/profile': { view: 'main', page: 'profile' },
  '/search': { view: 'search', page: 'home' },
  '/seats': { view: 'seats', page: 'home' },
  '/payment': { view: 'checkout', page: 'home' },
  '/booking-success': { view: 'invoice', page: 'home' },
  '/ticket': { view: 'ticket', page: 'tickets' },
  '/trip-status': { view: 'tracking', page: 'tickets' },
};

const STATE_TO_PATH = {
  'main:home': '/home',
  'main:bookings': '/bookings',
  'main:tickets': '/tickets',
  'main:wallet': '/wallet',
  'main:profile': '/profile',
  'search:home': '/search',
  'seats:home': '/seats',
  'checkout:home': '/payment',
  'invoice:home': '/booking-success',
  'ticket:tickets': '/ticket',
  'tracking:tickets': '/trip-status',
};

const NAV_ITEMS = [
  { key: 'home', label: 'الرئيسية', icon: Home },
  { key: 'bookings', label: 'رحلاتي', icon: Route },
  { key: 'tickets', label: 'التذاكر', icon: QrCode },
  { key: 'wallet', label: 'المحفظة', icon: WalletIcon },
  { key: 'profile', label: 'الحساب', icon: User },
];

const _buildInvoiceItems = ({ passengers, baseTotal, luggageFee, autoDiscount, promoDiscount }) => [
  { name: `تذاكر (${passengers})`, price: baseTotal },
  ...(luggageFee > 0 ? [{ name: 'وزن إضافي', price: luggageFee }] : []),
  ...(autoDiscount > 0 ? [{ name: 'خصم الباقة', price: -autoDiscount }] : []),
  ...(promoDiscount > 0 ? [{ name: 'كود خصم', price: -promoDiscount }] : []),
];

const formatCancellationErrorMessage = (result) => {
  if (!result) return 'تعذر إلغاء الحجز حالياً.';
  const payload = String(result?.message || result?.error?.message || '').toLowerCase();
  if (payload.includes('has no field "date"')) {
    return 'الإلغاء غير متاح حاليًا بسبب تحديث في الخادم. لو محتاج تلغي الحجز الآن، شغّل ملف SQL المرفق أو راجع إدارة قاعدة البيانات.';
  }
  if (result.errorClass === 'missing_rpc' || isMissingRpcError(result, 'cancel_booking_atomic')) {
    return 'الإلغاء غير متاح حاليًا. جرّب مرة تانية بعد شوية أو تواصل مع الدعم.';
  }
  return result.message || 'تعذر إلغاء الحجز حالياً.';
};

function readInternalOpsEnabled() {
  if (String(import.meta.env.VITE_ENABLE_INTERNAL_OPS || '').toLowerCase() === 'true') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('ops') === '1';
  } catch {
    return false;
  }
}

function resolveStateFromPath(pathname) {
  return ROUTE_TO_STATE[pathname] || { view: 'main', page: 'home' };
}

function createPath(view, page) {
  return STATE_TO_PATH[`${view}:${page}`] || '/home';
}

function SidebarNavButton({ item, active, compact, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`app-sidebar-nav-button app-pressable group relative flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-right transition-all duration-300 ${compact ? 'justify-center px-0' : ''} ${active ? 'is-active bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_22px_48px_-26px_rgba(16,35,63,0.65)]' : ''}`}
    >
      <span className={`app-sidebar-icon-shell grid h-11 w-11 place-items-center rounded-[16px] transition-all duration-300 ${active ? 'bg-white/12 text-white ring-1 ring-white/10' : ''}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className={`app-sidebar-label flex-1 ${compact ? 'app-sidebar-label-collapsed' : ''}`}>
        <p className="text-sm font-black whitespace-nowrap">{item.label}</p>
      </div>
    </button>
  );
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
  const initialRoute = resolveStateFromPath(typeof window !== 'undefined' ? window.location.pathname || '/home' : '/home');
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
    _setMyTrips,
    points,
    setPoints,
    subscription,
    setSubscription,
    backendLoading,
    refreshCloudState,
  } = useCloudAppState(userId);

  const [activePage, setActivePage] = useState(initialRoute.page);
  const [activeView, setActiveView] = useState(initialRoute.view);
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const [searchParams, setSearchParams] = useState({ from: '', to: '', date: todayDate, passengers: 1 });
  const [searchResults, setSearchResults] = useState({ trips: [], isDirect: true });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [viewedTicket, setViewedTicket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
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
    activePage,
    activeView,
  };


  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuVisible(true);
      return undefined;
    }

    if (typeof window === 'undefined') {
      setIsMobileMenuVisible(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setIsMobileMenuVisible(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [isMobileMenuOpen]);

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

  const { notifications, unreadCount, markAllRead, clearNotifications, requestBrowserPermission } = useTripNotifications({
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
      activePage,
    }),
    [selectedTrip?.from, selectedTrip?.to, searchParams.from, searchParams.to, searchParams.passengers, activeView, activePage],
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
    if (result?.ok) clearPendingReferralCode();
    if (result?.message) showToast(result.message, result.ok ? 'success' : 'error');
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
    if (!referralCodeFromUrl) return;
    stashPendingReferralCode(referralCodeFromUrl);
  }, [referralCodeFromUrl]);

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

      if (summary?.appliedCode) {
        clearPendingReferralCode();
      }

      const pendingCode = readPendingReferralCode() || referralCodeFromUrl;
      if (!pendingCode || summary?.canApplyCode === false) return;
      if (appliedReferralCodesRef.current.has(`${userId}:${pendingCode}`)) return;

      appliedReferralCodesRef.current.add(`${userId}:${pendingCode}`);
      const result = await applyReferralCodeRpc({ userId, code: pendingCode });
      if (!active) return;
      if (result?.ok) {
        clearPendingReferralCode();
      }
      if (result?.message) showToast(result.message, result.ok ? 'success' : 'error');
      const refreshed = await getReferralSummary({ userId });
      if (active) setReferralSummary(refreshed);
    })();
    return () => {
      active = false;
    };
  }, [userId, myTrips.length, referralCodeFromUrl]);

  useEffect(() => {
    let active = true;
    const loadOffer = async () => {
      if (!userId) {
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
            metadata: { code: entry.code || '', triggerKind: entry.triggerKind || '' },
          });
        }
      });

      if (!offer.popupEnabled) return;

      const popupKey = offer.campaignId || offer.code || offer.title || 'popup';
      if (dismissedPromoPopupRef.current.has(`${userId}:${popupKey}`)) return;
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
            metadata: { code: offer.code || '', triggerKind: offer.triggerKind || '' },
          });
        }
      }
    };

    const timeoutId = window.setTimeout(loadOffer, 900);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [userId, activeModal, isGuideOpen, promoContext]);

  const dismissPromoOffer = async () => {
    const popupKey = promoPopupOffer?.campaignId || promoPopupOffer?.code || promoPopupOffer?.title || 'popup';
    if (userId) dismissedPromoPopupRef.current.add(`${userId}:${popupKey}`);
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

  const syncLocation = useCallback((view, page, { replace = false } = {}) => {
    const path = createPath(view, page);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname || '/home' : '/home';
    if (currentPath === path) return;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', path);
  }, []);

  const navigateTo = useCallback(
    (nextView, nextPage = activePage, options = {}) => {
      setActiveView(nextView);
      setActivePage(nextPage);
      syncLocation(nextView, nextPage, options);
      setIsMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
    },
    [activePage, syncLocation],
  );

  useEffect(() => {
    const handlePopState = () => {
      const next = resolveStateFromPath(window.location.pathname || '/home');
      setActiveView(next.view);
      setActivePage(next.page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const goBack = () => {
    if (activeView === 'invoice') navigateTo('ticket', 'tickets');
    else if (activeView === 'checkout') navigateTo('seats');
    else if (activeView === 'seats') navigateTo('search');
    else if (activeView === 'search') navigateTo('main', 'home');
    else if (activeView === 'ticket') navigateTo('main', 'tickets');
    else if (activeView === 'tracking') navigateTo('ticket', 'tickets');
    else navigateTo('main', 'home');
  };

  const handleSearch = async (predefinedParams = null) => {
    const params = predefinedParams || searchParams;
    if (!params.from || !params.to || !params.date) return showToast('حدد مكان التحرك والوصول وتاريخ الرحلة الأول.', 'error');
    if (params.from === params.to) return showToast('محافظة التحرك هي نفس محافظة الوصول.', 'error');
    if (predefinedParams) setSearchParams(params);

    setIsSearching(true);
    navigateTo('search');

    try {
      const results = await searchTripInventory({ from: params.from, to: params.to, date: params.date, passengers: params.passengers });
      const authoritativeTrips = Array.isArray(results?.trips) ? results.trips.filter((trip) => String(trip?.instanceId || '').trim()) : [];
      const hasFallbackSource = String(results?.source || '').toLowerCase().includes('fallback');
      const hasNonAuthoritativeTrips = Array.isArray(results?.trips) ? results.trips.some((trip) => !String(trip?.instanceId || '').trim()) : false;

      if (hasFallbackSource || hasNonAuthoritativeTrips) {
        log.error('non_authoritative_search_blocked', { from: params.from, to: params.to, date: params.date, passengers: params.passengers, source: results?.source || null });
        setSearchResults({ trips: [], isDirect: Boolean(results?.isDirect ?? true) });
        showToast('تعذر تحميل رحلات صالحة من السيرفر حالياً. حاول مرة تانية بعد قليل.', 'error');
        return;
      }

      setSearchResults({ ...results, trips: authoritativeTrips });
    } catch (error) {
      log.error('search_failed', { from: params.from, to: params.to, date: params.date, passengers: params.passengers, error });
      setSearchResults({ trips: [], isDirect: true });
      showToast('تعذر تحميل الرحلات من السيرفر حالياً. حاول مرة تانية بعد قليل.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const finalizeBookingSuccess = (ticket, invoice) => {
    const normalizedTicket = ensureTicketIdentity(ticket);
    setCurrentInvoice(invoice);
    setViewedTicket(normalizedTicket);
    log.info('booking_finalized', { bookingId: normalizedTicket?.bookingId || normalizedTicket?.id || null, pnr: normalizedTicket?.pnr || null, runtimeMode });
    navigateTo('invoice');
  };

  const createBookingForTrip = async ({ trip, seatNumbers, passengers, promoCode, promoDiscountAmount: _promoDiscountAmount = 0, hasLuggage, needsAccess }) => {
    if (!trip?.instanceId) {
      return { ok: false, code: 'backend_trip_required', message: 'الحجز الحقيقي متاح فقط على الرحلات المرتبطة بالسيرفر. أعد البحث وجرب رحلة متصلة بالسيرفر.' };
    }
    const result = await createBookingAtomic({ tripInstanceId: trip.instanceId, seatNumbers, passengers, promoCode, hasLuggage, rideToStation: false, needsAccess });
    if (result?.ok) {
      await refreshCloudState({ silent: true, force: true });
      if (result.booking) result.booking = ensureTicketIdentity(result.booking);
    }
    return result;
  };

  const commitSeatSelection = async (tripArg = selectedTrip, seatNumbersArg = selectedSeats) => {
    if (!tripArg) return { ok: false, message: 'No trip selected' };
    if (!tripArg?.instanceId) {
      const result = { ok: false, code: 'backend_trip_required', message: 'اختيار المقاعد الحقيقي متاح فقط على الرحلات المرتبطة بالسيرفر.' };
      showToast(result.message, 'error');
      return result;
    }

    const holdResult = await holdTripSeats({ tripInstanceId: tripArg.instanceId, seatNumbers: seatNumbersArg });
    if (!holdResult?.ok) {
      showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة.', 'error');
      try {
        setSelectedTrip(await hydrateTripWithSeats(tripArg));
      } catch (error) {
        log.warn('seat_rehydrate_after_hold_failure_failed', { tripInstanceId: tripArg.instanceId, error });
      }
      return holdResult;
    }

    setSelectedTrip((prev) => ({ ...prev, holdExpiresAt: holdResult.hold_expires_at || holdResult.holdExpiresAt || null }));
    navigateTo('checkout');
    return holdResult;
  };

  const processDelayedRefund = async (tripToCancel) => {
    const bookingId = tripToCancel?.bookingId || tripToCancel?.id || null;
    if (!bookingId) return showToast('الإلغاء الحقيقي متاح فقط للحجوزات المرتبطة بالسيرفر.', 'error');

    setPendingCancellationBookingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
    try {
      const result = await cancelBookingAtomicCompat({
        bookingId,
        clientActionId: `cancel-ui-${bookingId}-${Date.now()}` ,
      });
      if (!result?.ok) {
        showToast(formatCancellationErrorMessage(result), 'error');
        await refreshCloudState({ silent: true, force: true });
        return;
      }
      showToast(`تم الإلغاء، ورجعلك ${Number(result?.refundAmount || 0)} ج.م للمحفظة.`, 'success');
      await refreshCloudState({ silent: true, force: true });
    } catch (error) {
      log.error('booking_cancel_failed', { bookingId, pnr: tripToCancel?.pnr || null, error });
      showToast(formatCancellationErrorMessage(error), 'error');
      try {
        await refreshCloudState({ silent: true, force: true });
      } catch (refreshError) {
        log.warn('booking_cancel_refresh_failed', { bookingId, error: refreshError });
      }
    } finally {
      setPendingCancellationBookingIds((prev) => prev.filter((id) => id !== bookingId));
    }
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const wait = (ms = 80) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const api = {
      snapshot: () => ({ ...qaStateRef.current }),
      async goHome() { navigateTo('main', 'home'); await wait(); return 'home'; },
      async goWallet() { navigateTo('main', 'wallet'); await wait(); return 'wallet'; },
      async goBookings() { navigateTo('main', 'bookings'); await wait(); return 'bookings'; },
      async goTickets() { navigateTo('main', 'tickets'); await wait(); return 'tickets'; },
      async search(params = {}) {
        const next = { from: params.from || qaStateRef.current.searchParams?.from || 'القاهرة', to: params.to || qaStateRef.current.searchParams?.to || 'الإسكندرية', date: params.date || getLocalDateInputValue(), passengers: Number(params.passengers || qaStateRef.current.searchParams?.passengers || 1) };
        await handleSearch(next);
        await wait(250);
        return this.snapshot().searchResults;
      },
      async openTrip(index = 0) {
        const trips = qaStateRef.current.searchResults?.trips || [];
        const trip = trips[index];
        if (!trip) return null;
        const hydrated = await hydrateTripWithSeats(trip);
        setSelectedTrip(hydrated);
        setSelectedSeats([]);
        navigateTo('seats');
        await wait(150);
        return hydrated;
      },
      async smoke() {
        await this.goHome();
        await this.search({ from: 'القاهرة', to: 'الإسكندرية', passengers: 1 });
        await this.openTrip(0);
        await wait(150);
        return this.snapshot();
      },
    };
    window.taree2yDev = api;
    return () => {
      if (window.taree2yDev === api) delete window.taree2yDev;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, activeView, searchResults, searchParams, selectedTrip, selectedSeats, currentInvoice, viewedTicket, myTrips, wallet, points, subscription, transactions]);

  const latestTrip = useMemo(() => {
    const safeTrips = Array.isArray(myTrips) ? myTrips.map(ensureTicketIdentity) : [];
    return safeTrips.find((trip) => ['upcoming', 'refund_pending'].includes(trip?.status)) || safeTrips[0] || null;
  }, [myTrips]);

  const upcomingTickets = useMemo(() => (Array.isArray(myTrips) ? myTrips.map(ensureTicketIdentity) : []).filter((trip) => ['upcoming', 'refund_pending'].includes(trip?.status)), [myTrips]);

  const pageTitle = useMemo(() => {
    if (activeView === 'search') return { title: 'اختيار الرحلة', subtitle: 'راجع الخيارات وحدد الأنسب ليك' };
    if (activeView === 'seats') return { title: 'اختيار المقاعد', subtitle: 'ثبت المقاعد قبل الدفع' };
    if (activeView === 'checkout') return { title: 'الدفع والتأكيد', subtitle: 'راجع كل شيء قبل الحجز النهائي' };
    if (activeView === 'invoice') return { title: 'تم الحجز', subtitle: 'التذكرة جاهزة دلوقتي' };
    if (activeView === 'ticket') return { title: 'التذكرة', subtitle: 'كل تفاصيل الصعود في مكان واحد' };
    if (activeView === 'tracking') return { title: 'متابعة الرحلة', subtitle: 'اعرف حالة الرحلة لحظة بلحظة' };
    if (activePage === 'bookings') return { title: 'رحلاتي', subtitle: 'إدارة الحجوزات' };
    if (activePage === 'tickets') return { title: 'التذاكر', subtitle: 'الوصول السريع للـ QR' };
    if (activePage === 'wallet') return { title: 'المحفظة', subtitle: 'الرصيد والحركات' };
    if (activePage === 'profile') return { title: 'الحساب', subtitle: 'البيانات والإعدادات' };
    return { title: 'الرئيسية', subtitle: 'ابدأ الحجز بسرعة ووضوح' };
  }, [activePage, activeView]);

  if (backendLoading) {
    return <div className="grid min-h-[100dvh] flex-1 place-items-center bg-[var(--bg)] text-slate-700 dark:bg-slate-950 dark:text-slate-200">جاري تجهيز بيانات حسابك…</div>;
  }

  return (
    <>
      <ToastStack toasts={toasts} />

      <div className="flex min-h-[100dvh] w-full bg-[var(--bg)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <aside className={`app-shell-glow app-sidebar-panel app-sidebar-surface fixed inset-y-0 right-0 z-40 hidden overflow-hidden border-l border-[var(--sidebar-line)] px-4 py-5 md:flex ${isSidebarCompact ? 'w-[108px]' : 'w-[312px]'}`}>
          <div className="flex h-full w-full flex-col gap-5">
            <div className={`flex items-center ${isSidebarCompact ? 'justify-center' : 'justify-between gap-3'}`}>
              <button
                type="button"
                onClick={() => navigateTo('main', 'home')}
                className={`group flex items-center ${isSidebarCompact ? 'justify-center' : 'gap-3'}`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--sidebar-soft)] text-[var(--sidebar-ink)] shadow-[0_18px_45px_-25px_rgba(16,35,63,0.22)] ring-1 ring-[var(--sidebar-line)]">
                  <Compass className="h-5 w-5" />
                </span>
                {!isSidebarCompact ? (
                  <div>
                    <p className="text-lg font-black leading-none tracking-tight text-[var(--sidebar-ink)]">طريقي</p>
                    <p className="text-xs font-bold text-[var(--sidebar-ink-muted)]">رحلات مصر بشكل أوضح</p>
                  </div>
                ) : null}
              </button>
              {!isSidebarCompact ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarCompact(true)}
                  className="app-sidebar-toggle app-pressable grid h-11 w-11 place-items-center rounded-[18px] border transition"
                  aria-label="تصغير الشريط الجانبي"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            {isSidebarCompact ? (
              <button
                type="button"
                onClick={() => setIsSidebarCompact(false)}
                className="app-sidebar-toggle app-pressable mx-auto grid h-11 w-11 place-items-center rounded-[18px] border transition"
                aria-label="فتح الشريط الجانبي"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : null}

            <nav className="flex-1 space-y-2 overflow-y-auto pt-2">
              {NAV_ITEMS.map((item) => (
                <SidebarNavButton
                  key={item.key}
                  item={item}
                  compact={isSidebarCompact}
                  active={activeView === 'main' && activePage === item.key}
                  onClick={() => navigateTo('main', item.key)}
                />
              ))}
            </nav>

            <div className={`space-y-3 ${isSidebarCompact ? 'items-center' : ''}`}>
              {!isSidebarCompact ? (
                <div className="app-sidebar-card rounded-[24px] border p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black tracking-[0.16em] text-[var(--sidebar-ink-muted)]">الرصيد الحالي</p>
                      <p className="mt-2 text-xl font-black">{wallet} ج.م</p>
                    </div>
                    <MetaChip label={`${Number(points || 0)} نقطة`} tone="neutral" className="border-[var(--sidebar-line)] bg-[var(--sidebar-soft)] text-[var(--sidebar-ink)] dark:border-[var(--sidebar-line)] dark:bg-[var(--sidebar-soft)] dark:text-[var(--sidebar-ink)]" />
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setIsDark((current) => !current)}
                className={`app-sidebar-toggle app-pressable flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 transition-all duration-300 ${isSidebarCompact ? 'justify-center px-0' : ''}`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-[16px] bg-[var(--sidebar-soft)] ring-1 ring-[var(--sidebar-line)]">
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </span>
                {!isSidebarCompact ? <span className="text-sm font-black">{isDark ? 'الوضع الفاتح' : 'الوضع الليلي'}</span> : null}
              </button>
            </div>
          </div>
        </aside>

        {isMobileMenuVisible ? (
          <div className={`app-mobile-drawer-overlay fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm md:hidden ${isMobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`} onClick={() => setIsMobileMenuOpen(false)}>
            <div className={`app-mobile-drawer-panel app-sidebar-surface h-full w-[84vw] max-w-[340px] border-l border-[var(--sidebar-line)] p-4 ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black leading-none tracking-tight text-[var(--sidebar-ink)]">طريقي</p>
                  <p className="text-xs font-bold text-[var(--sidebar-ink-muted)]">تنقل أوضح وأسهل</p>
                </div>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="app-sidebar-toggle grid h-11 w-11 place-items-center rounded-[18px] border">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 space-y-2">
                {NAV_ITEMS.map((item) => (
                  <SidebarNavButton key={item.key} item={item} compact={false} active={activeView === 'main' && activePage === item.key} onClick={() => navigateTo('main', item.key)} />
                ))}
                <button type="button" onClick={() => setActiveModal('help')} className="app-sidebar-nav-button app-pressable mt-2 flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-right transition">
                  <span className="app-sidebar-icon-shell grid h-11 w-11 place-items-center rounded-[16px]"><HelpCircle className="h-5 w-5" /></span>
                  <span className="text-sm font-black">المساعدة والدليل</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-x-clip ${isSidebarCompact ? 'md:pr-[108px]' : 'md:pr-[312px]'}`}>
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/78">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-4 md:px-6 xl:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={activeView === 'main' ? () => setIsMobileMenuOpen(true) : goBack}
                  className="app-pressable grid h-11 w-11 place-items-center rounded-[18px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:hidden"
                >
                  {activeView === 'main' ? <Menu className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>

                {activeView !== 'main' ? (
                  <button type="button" onClick={goBack} className="app-pressable hidden md:grid h-11 w-11 place-items-center rounded-[18px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:grid">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                ) : null}

                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{pageTitle.title}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{pageTitle.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('help')}
                  className="app-pressable hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-800 dark:hover:text-indigo-300 md:inline-flex"
                >
                  <HelpCircle className="h-4 w-4" />
                  المساعدة
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('notifications')}
                  className="app-pressable relative grid h-11 w-11 place-items-center rounded-[18px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  aria-label="التنبيهات"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount ? <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('main', 'wallet')}
                  className="app-pressable hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-800 dark:hover:text-indigo-300 sm:inline-flex"
                  dir="ltr"
                >
                  <WalletIcon className="h-4 w-4 text-emerald-500" />
                  {wallet} ج
                </button>
              </div>
            </div>
          </header>

          <main className="relative flex-1 overflow-visible">
            <div className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 md:px-6 md:pb-10 xl:px-8">
              <div key={`${activeView}:${activePage}:${viewedTicket?.pnr || ''}`} className="app-page-transition">
                {activeView === 'main' && activePage === 'home' ? (
                  <HomeView
                    searchParams={searchParams}
                    setSearchParams={setSearchParams}
                    onSearch={() => handleSearch()}
                    showToast={showToast}
                    onPromoSearch={handleSearch}
                    openModal={setActiveModal}
                    openGuide={openGuide}
                    isFirstTimeUser={Boolean(profile?.isFirstTimeUser ?? !profile?.onboarding_completed_at)}
                    latestTrip={latestTrip}
                    wallet={wallet}
                    points={points}
                    subscription={subscription}
                    promoHighlights={promoHighlights}
                    onPromoHighlightInteraction={handlePromoHighlightInteraction}
                    onOpenTickets={() => navigateTo('main', 'tickets')}
                    onOpenWallet={() => navigateTo('main', 'wallet')}
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
                        log.error('seat_load_failed_before_selection', { tripInstanceId: trip?.instanceId || null, tripCode: trip?.tripCode || trip?.id || null, error });
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

                {activeView === 'main' && activePage === 'bookings' ? (
                  <TripsView
                    trips={myTrips.map(ensureTicketIdentity)}
                    processRefund={processDelayedRefund}
                    pendingCancellationBookingIds={pendingCancellationBookingIds}
                    onViewTicket={(ticket) => {
                      setViewedTicket(ensureTicketIdentity(ticket));
                      navigateTo('ticket', 'tickets');
                    }}
                    showToast={showToast}
                  />
                ) : null}

                {activeView === 'main' && activePage === 'tickets' ? (
                  <TicketsHubView
                    tickets={upcomingTickets}
                    onOpenTicket={(ticket) => {
                      setViewedTicket(ensureTicketIdentity(ticket));
                      navigateTo('ticket', 'tickets');
                    }}
                    onTrackTicket={(ticket) => {
                      setViewedTicket(ensureTicketIdentity(ticket));
                      navigateTo('tracking', 'tickets');
                    }}
                  />
                ) : null}

                {activeView === 'ticket' && viewedTicket ? (
                  <TicketView ticket={ensureTicketIdentity(viewedTicket)} user={user} onTrack={() => navigateTo('tracking', 'tickets')} showToast={showToast} />
                ) : null}

                {activeView === 'tracking' && viewedTicket ? <TrackingView ticket={ensureTicketIdentity(viewedTicket)} showToast={showToast} /> : null}

                {activeView === 'main' && activePage === 'wallet' ? (
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

                {activeView === 'main' && activePage === 'profile' ? (
                  <ProfileView
                    user={user}
                    profile={profile}
                    points={points}
                    subscription={subscription}
                    isDark={isDark}
                    setIsDark={setIsDark}
                    refreshProfile={refreshProfile}
                    onLogout={async () => {
                      const result = await signOutCurrentUser();
                      if (!result?.ok) log.error('logout_failed', { error: result?.error || null });
                      return result;
                    }}
                    showToast={showToast}
                    openModal={setActiveModal}
                    openGuide={openGuide}
                    referralSummary={referralSummary}
                    refreshReferralSummary={refreshReferralSummary}
                    applyReferralCode={handleApplyReferralCode}
                  />
                ) : null}
              </div>
            </div>
          </main>

          {activeView === 'main' ? (
            <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
              <nav className="mx-auto grid max-w-[430px] grid-cols-5 items-center gap-2 rounded-[28px] border border-[var(--line)] bg-[var(--surface-overlay)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
                {NAV_ITEMS.map((item) => (
                  <BottomNavItem
                    key={item.key}
                    icon={<item.icon />}
                    label={item.label}
                    active={activePage === item.key}
                    onClick={() => navigateTo('main', item.key)}
                  />
                ))}
              </nav>
            </div>
          ) : null}
        </div>
      </div>

      {activeModal === 'help' ? <ChatbotModal closeModal={() => setActiveModal(null)} user={user} openGuide={openGuide} /> : null}

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
            setActiveModal(null);
            window.setTimeout(() => {
              setWalletQrInitialAmount(amount);
              setActiveModal('wallet_qr');
            }, 60);
          }}
        />
      ) : null}

      {activeModal === 'notifications' ? (
        <NotificationsModal
          closeModal={() => setActiveModal(null)}
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
          onCopyOffer={(offer) => handlePromoHighlightInteraction(offer, 'copied')}
        />
      ) : null}

      <OnboardingGuide isOpen={isGuideOpen} onClose={closeGuide} onComplete={completeGuide} />

      {internalOpsEnabled ? (
        <>
          <button
            type="button"
            onClick={() => setActiveModal('internal_ops')}
            className="interactive-press fixed bottom-[calc(env(safe-area-inset-bottom)+92px)] left-4 z-40 hidden min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-overlay)] px-4 py-2 text-sm font-black text-[var(--ink)] shadow-[var(--shadow-md)] backdrop-blur-xl md:inline-flex"
          >
            تشغيل داخلي
          </button>

          {activeModal === 'internal_ops' ? (
            <InternalOpsPanel
              closeModal={() => setActiveModal(null)}
              userId={userId}
              user={user}
              wallet={wallet}
              points={points}
              subscription={subscription}
              latestTrip={latestTrip}
              onRefresh={(options) => refreshCloudState(options)}
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
        </>
      ) : null}
    </>
  );
}
