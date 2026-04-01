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
import { createLogger } from '../../lib/logger';
import { markAppOpen } from '../../lib/account';
import { signOutCurrentUser } from '../../lib/auth';
import { useCloudAppState } from '../hooks/useCloudAppState';
import { getLocalDateInputValue } from '../utils/travel';
import { ensureTicketIdentity } from '../utils/tripIdentity';
import { formatCurrency, formatInteger } from '../utils/formatting';
import { isQaModeEnabled } from '../utils/qaMode';
import { useOnboardingGuide } from '../hooks/useOnboardingGuide';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAppNavigation, scheduleViewportScrollReset } from '../hooks/useAppNavigation';
import { useTimedToasts } from '../hooks/useTimedToasts';
import { useBookingFlow } from '../hooks/useBookingFlow';
import { useGrowthFlows } from '../hooks/useGrowthFlows';
import { BottomNavItem, MetaChip } from './ui/AppPrimitives';
import HeaderNetworkIndicator from './ui/HeaderNetworkIndicator';
import NetworkStatusBanner from './ui/NetworkStatusBanner';
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

function readInternalOpsEnabled() {
  if (String(import.meta.env.VITE_ENABLE_INTERNAL_OPS || '').toLowerCase() === 'true') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('ops') === '1';
  } catch {
    return false;
  }
}

const NAV_ITEMS = [
  { key: 'home', label: 'الرئيسية', icon: Home },
  { key: 'bookings', label: 'رحلاتي', icon: Route },
  { key: 'tickets', label: 'التذاكر', icon: QrCode },
  { key: 'wallet', label: 'المحفظة', icon: WalletIcon },
  { key: 'profile', label: 'الحساب', icon: User },
];

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
  const todayDate = getLocalDateInputValue();
  const isQaMode = isQaModeEnabled();

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

  const networkStatus = useNetworkStatus();
  const { isOnline, showBanner: showNetworkBanner, justRestored } = networkStatus;
  const { toasts, showToast } = useTimedToasts();

  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [notificationAnchorTick, setNotificationAnchorTick] = useState(0);
  const [walletQrInitialAmount, setWalletQrInitialAmount] = useState(null);
  const [internalOpsEnabled] = useState(readInternalOpsEnabled);

  const { activePage, activeView, navigateTo, goBack } = useAppNavigation({
    activeModal,
    onNavigate: () => {
      setIsMobileMenuOpen(false);
      if (activeModal === 'notifications') {
        setActiveModal(null);
      }
    },
  });

  const requireOnline = useCallback(
    (message = 'العملية دي محتاجة إنترنت ثابت حالياً.', tone = 'warning') => {
      if (isOnline) return true;
      showToast(message, tone);
      return false;
    },
    [isOnline, showToast],
  );

  const {
    searchParams,
    setSearchParams,
    searchResults,
    isSearching,
    selectedTrip,
    selectedSeats,
    setSelectedSeats,
    currentInvoice,
    viewedTicket,
    setViewedTicket,
    pendingCancellationBookingIds,
    handleSearch,
    finalizeBookingSuccess,
    createBookingForTrip,
    commitSeatSelection,
    processDelayedRefund,
    selectTripForSeats,
    normalizedTrips,
    latestTrip,
    upcomingTickets,
    openTicket,
    openTracking,
  } = useBookingFlow({
    userId,
    todayDate,
    isQaMode,
    requireOnline,
    showToast,
    navigateTo,
    refreshCloudState,
    runtimeMode,
    myTrips,
    setMyTrips,
    wallet,
    setWallet,
    points,
    setPoints,
    transactions,
    setTransactions,
    subscription,
    activePage,
    activeView,
  });

  const { isGuideOpen, openGuide, closeGuide, completeGuide } = useOnboardingGuide({
    userId,
    profile,
    onProfileUpdated: async () => {
      await refreshProfile?.();
    },
  });

  const {
    notifications,
    unreadCount,
    markAllRead,
    clearNotifications,
    markNotificationRead,
    dismissNotification,
    requestBrowserPermission,
    referralSummary,
    refreshReferralSummary,
    handleApplyReferralCode,
    promoPopupOffer,
    promoHighlights,
    handlePromoHighlightInteraction,
    dismissPromoOffer,
    handleNotificationAction,
  } = useGrowthFlows({
    userId,
    profile,
    refreshProfile,
    activeView,
    activePage,
    activeModal,
    setActiveModal,
    isGuideOpen,
    searchParams,
    selectedTrip,
    myTrips: normalizedTrips,
    showToast,
    navigateTo,
  });

  const shownAuthWarningRef = useRef('');

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

  useEffect(() => {
    if (!authWarning) return;
    if (shownAuthWarningRef.current === authWarning) return;
    shownAuthWarningRef.current = authWarning;
    showToast(authWarning, 'error');
  }, [authWarning, showToast]);

  useEffect(() => {
    let active = true;
    if (!userId) return () => {
      active = false;
    };

    (async () => {
      try {
        await markAppOpen(userId, profile || null);
        if (active) {
          await refreshProfile?.();
        }
      } catch {
        // ignore profile heartbeat failures
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, profile, refreshProfile]);

  useEffect(() => {
    scheduleViewportScrollReset('auto');
    return undefined;
  }, [activePage, activeView, selectedTrip, currentInvoice, viewedTicket]);
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
      <NetworkStatusBanner isOnline={isOnline} show={showNetworkBanner} justRestored={justRestored} />

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
                      <p className="mt-2 text-xl font-black">{formatCurrency(wallet)}</p>
                    </div>
                    <MetaChip label={`${formatInteger(points || 0)} نقطة`} tone="neutral" className="border-[var(--sidebar-line)] bg-[var(--sidebar-soft)] text-[var(--sidebar-ink)] dark:border-[var(--sidebar-line)] dark:bg-[var(--sidebar-soft)] dark:text-[var(--sidebar-ink)]" />
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

                <HeaderNetworkIndicator
                  isOnline={networkStatus.isOnline}
                  justRestored={networkStatus.justRestored}
                  connectionLabel={networkStatus.connectionLabel}
                />

                <button
                  type="button"
                  onClick={() => {
                    setNotificationAnchorTick(Date.now());
                    setActiveModal((current) => (current === 'notifications' ? null : 'notifications'));
                  }}
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
                >
                  <WalletIcon className="h-4 w-4 text-emerald-500" />
                  {formatCurrency(wallet)}
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
                    onSelectTrip={selectTripForSeats}
                    showToast={showToast}
                    onGoHome={() => navigateTo('main', 'home')}
                    isOnline={isOnline}
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
                    isOnline={isOnline}
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
                    currentTrips={normalizedTrips}
                    onCreateBooking={createBookingForTrip}
                    onSuccess={finalizeBookingSuccess}
                    showToast={showToast}
                    openModal={setActiveModal}
                    isOnline={isOnline}
                  />
                ) : null}

                {activeView === 'invoice' && currentInvoice ? (
                  <InvoiceView invoice={currentInvoice} ticket={viewedTicket} onContinue={() => openTicket(viewedTicket)} />
                ) : null}

                {activeView === 'main' && activePage === 'bookings' ? (
                  <TripsView
                    trips={normalizedTrips}
                    processRefund={processDelayedRefund}
                    pendingCancellationBookingIds={pendingCancellationBookingIds}
                    onViewTicket={openTicket}
                    showToast={showToast}
                  />
                ) : null}

                {activeView === 'main' && activePage === 'tickets' ? (
                  <TicketsHubView
                    tickets={upcomingTickets}
                    onOpenTicket={openTicket}
                    onTrackTicket={openTracking}
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
          key={notificationAnchorTick}
          closeModal={() => setActiveModal(null)}
          notifications={notifications}
          unreadCount={unreadCount}
          markAllRead={markAllRead}
          clearNotifications={clearNotifications}
          markNotificationRead={markNotificationRead}
          dismissNotification={dismissNotification}
          requestBrowserPermission={requestBrowserPermission}
          onOpenItem={handleNotificationAction}
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
