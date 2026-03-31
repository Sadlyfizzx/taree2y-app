import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLogger } from '../../lib/logger';
import { formatCurrency, formatInteger } from '../utils/formatting';
import { buildQaSearchResults } from '../utils/qaMode';
import { getLocalDateInputValue, getTripBookingUiState } from '../utils/travel';
import { ensureTicketIdentity } from '../utils/tripIdentity';
import {
  createBookingAtomic,
  holdTripSeats,
  hydrateTripWithSeats,
  searchTripInventory,
} from '../../lib/tripInventory';
import { cancelBookingAtomicCompat } from '../../lib/cancelBookingCompat';
import { scheduleViewportScrollReset } from './useAppNavigation';

const log = createLogger('booking-flow');

function formatCancellationErrorMessage(result) {
  if (!result) return 'تعذر إلغاء الحجز حالياً.';
  const payload = String(result?.message || result?.error?.message || '').toLowerCase();
  if (payload.includes('has no field "date"')) {
    return 'الإلغاء غير متاح دلوقتي. جرّب بعد شوية أو تواصل مع الدعم لو كانت الرحلة قريبة.';
  }
  return result.message || 'تعذر إلغاء الحجز حالياً.';
}


const BOOKING_FLOW_DRAFT_KEY = 'taree2y-booking-flow-draft-v1';
const HOLD_RESUME_WINDOW_MS = 5 * 60 * 1000;

function safeSessionStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readBookingFlowDraft() {
  const storage = safeSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(BOOKING_FLOW_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeBookingFlowDraft(draft) {
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(BOOKING_FLOW_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore storage write errors
  }
}

function clearBookingFlowDraft() {
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(BOOKING_FLOW_DRAFT_KEY);
  } catch {
    // ignore storage remove errors
  }
}

function getHoldExpiry(candidate) {
  return String(candidate?.holdExpiresAt || candidate?.hold_expires_at || '').trim();
}

function isHoldExpired(candidate) {
  const expiry = getHoldExpiry(candidate);
  if (!expiry) return true;
  const value = new Date(expiry).getTime();
  if (!Number.isFinite(value)) return true;
  return value <= Date.now();
}

function shouldPersistFlowDraft({ activeView, currentInvoice, viewedTicket, selectedTrip }) {
  if (['search', 'seats', 'checkout'].includes(activeView)) return true;
  if (activeView === 'invoice' && currentInvoice && viewedTicket) return true;
  if (['ticket', 'tracking'].includes(activeView) && viewedTicket) return true;
  return Boolean(selectedTrip && getHoldExpiry(selectedTrip));
}

export function useBookingFlow({
  userId,
  todayDate = getLocalDateInputValue(),
  isQaMode = false,
  requireOnline,
  showToast,
  navigateTo,
  refreshCloudState,
  runtimeMode = 'supabase',
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
}) {
  const [searchParams, setSearchParams] = useState({ from: '', to: '', date: todayDate, passengers: 1 });
  const [searchResults, setSearchResults] = useState({ trips: [], isDirect: true });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [viewedTicket, setViewedTicket] = useState(null);
  const [pendingCancellationBookingIds, setPendingCancellationBookingIds] = useState([]);

  const qaStateRef = useRef({});
  const restoreAttemptedRef = useRef(false);
  const restoredDraftSignatureRef = useRef('');
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
    if (!userId) {
      clearBookingFlowDraft();
      return;
    }

    if (!shouldPersistFlowDraft({ activeView, currentInvoice, viewedTicket, selectedTrip })) {
      clearBookingFlowDraft();
      return;
    }

    writeBookingFlowDraft({
      userId,
      activeView,
      activePage,
      searchParams,
      searchResults,
      selectedTrip,
      selectedSeats,
      currentInvoice,
      viewedTicket,
      savedAt: new Date().toISOString(),
      runtimeMode,
      isQaMode,
    });
  }, [
    activePage,
    activeView,
    currentInvoice,
    currentInvoice?.pnr,
    isQaMode,
    runtimeMode,
    searchParams,
    searchResults,
    selectedSeats,
    selectedTrip,
    selectedTrip?.bookingId,
    selectedTrip?.holdExpiresAt,
    selectedTrip?.instanceId,
    userId,
    viewedTicket,
    viewedTicket?.bookingId,
    viewedTicket?.pnr,
  ]);

  const handleSearch = useCallback(async (predefinedParams = null) => {
    const params = predefinedParams || searchParams;
    if (!params.from || !params.to || !params.date) return showToast('حدد مكان التحرك والوصول وتاريخ الرحلة الأول.', 'error');
    if (params.from === params.to) return showToast('محافظة التحرك هي نفس محافظة الوصول.', 'error');
    if (predefinedParams) setSearchParams(params);

    setSelectedTrip(null);
    setSelectedSeats([]);
    setCurrentInvoice(null);
    setViewedTicket(null);

    if (!requireOnline('أنت حالياً أوفلاين. اتأكد من الإنترنت قبل تحديث نتائج الرحلات.', 'warning')) {
      return;
    }

    setIsSearching(true);
    navigateTo('search');

    try {
      if (isQaMode) {
        setSearchResults(buildQaSearchResults(params));
        return;
      }
      const results = await searchTripInventory({ from: params.from, to: params.to, date: params.date, passengers: params.passengers });
      const authoritativeTrips = Array.isArray(results?.trips) ? results.trips.filter((trip) => String(trip?.instanceId || '').trim()) : [];
      const hasFallbackSource = String(results?.source || '').toLowerCase().includes('fallback');
      const hasNonAuthoritativeTrips = Array.isArray(results?.trips) ? results.trips.some((trip) => !String(trip?.instanceId || '').trim()) : false;

      if (hasFallbackSource || hasNonAuthoritativeTrips) {
        log.error('non_authoritative_search_blocked', { from: params.from, to: params.to, date: params.date, passengers: params.passengers, source: results?.source || null });
        setSearchResults({ trips: [], isDirect: Boolean(results?.isDirect ?? true) });
        showToast('تعذر تحميل رحلات صالحة حالياً. حاول مرة تانية بعد قليل.', 'error');
        return;
      }

      setSearchResults({ ...results, trips: authoritativeTrips });
    } catch (error) {
      log.error('search_failed', { from: params.from, to: params.to, date: params.date, passengers: params.passengers, error });
      setSearchResults({ trips: [], isDirect: true });
      showToast('تعذر تحميل الرحلات حالياً. حاول مرة تانية بعد قليل.', 'error');
    } finally {
      setIsSearching(false);
    }
  }, [isQaMode, navigateTo, requireOnline, searchParams, showToast]);

  const finalizeBookingSuccess = useCallback((ticket, invoice) => {
    const normalizedTicket = ensureTicketIdentity({
      ...ticket,
      status: getTripBookingUiState(ticket).displayStatus,
    });
    setCurrentInvoice(invoice);
    setViewedTicket(normalizedTicket);
    setSelectedTrip(normalizedTicket);
    setSelectedSeats([]);
    log.info('booking_finalized', { bookingId: normalizedTicket?.bookingId || normalizedTicket?.id || null, pnr: normalizedTicket?.pnr || null, runtimeMode });
    scheduleViewportScrollReset('auto');
    navigateTo('invoice');
    window.setTimeout(() => scheduleViewportScrollReset('auto'), 80);
  }, [navigateTo, runtimeMode]);

  const createBookingForTrip = useCallback(async ({ trip, seatNumbers, passengers, promoCode, promoDiscountAmount: _promoDiscountAmount = 0, hasLuggage, needsAccess }) => {
    if (!requireOnline('أنت حالياً أوفلاين. اتأكد من الإنترنت قبل الدفع وتأكيد الحجز.', 'warning')) {
      return { ok: false, code: 'offline', message: 'أنت حالياً أوفلاين. اتأكد من الإنترنت قبل الدفع وتأكيد الحجز.' };
    }

    if (isQaMode) {
      const safeTrip = ensureTicketIdentity({
        ...trip,
        bookingId: trip?.bookingId || `qa-booking-${Date.now()}`,
        pnr: trip?.pnr || `QA${String(Date.now()).slice(-6)}`,
        seats: trip?.seats || [],
        seatNumbers,
        passengers,
        finalTotal: Number(trip?.price || 0) * Number(passengers || 1),
        status: 'upcoming',
      });
      const invoice = {
        pnr: safeTrip.pnr,
        total: safeTrip.finalTotal || 0,
        items: [
          { name: `تذاكر × ${formatInteger(passengers)}`, price: safeTrip.finalTotal || 0 },
        ],
      };
      setWallet((currentValue) => Math.max(0, Number(currentValue || 0) - Number(invoice.total || 0)));
      setPoints((currentValue) => Number(currentValue || 0) + Math.max(0, Math.floor(Number(invoice.total || 0) / 10)));
      setTransactions((currentValue) => [{
        id: `qa-txn-${Date.now()}`,
        type: 'booking_payment',
        amount: -Number(invoice.total || 0),
        createdAt: new Date().toISOString(),
        title: `حجز ${safeTrip.from} إلى ${safeTrip.to}`,
        status: 'completed',
      }, ...(Array.isArray(currentValue) ? currentValue : [])]);
      setMyTrips((currentValue) => [safeTrip, ...(Array.isArray(currentValue) ? currentValue : [])]);
      return { ok: true, booking: safeTrip, invoice };
    }

    if (!trip?.instanceId) {
      return { ok: false, code: 'backend_trip_required', message: 'الحجز غير متاح على الرحلة دي حالياً. حدّث النتائج وجرب رحلة متاحة.' };
    }
    const result = await createBookingAtomic({ tripInstanceId: trip.instanceId, seatNumbers, passengers, promoCode, hasLuggage, rideToStation: false, needsAccess });
    if (result?.ok) {
      await refreshCloudState({ silent: true, force: true });
      if (result.booking) result.booking = ensureTicketIdentity(result.booking);
    }
    return result;
  }, [isQaMode, requireOnline, refreshCloudState, setMyTrips, setPoints, setTransactions, setWallet]);

  const commitSeatSelection = useCallback(async (tripArg = selectedTrip, seatNumbersArg = selectedSeats) => {
    if (!tripArg) return { ok: false, message: 'No trip selected' };
    const normalizedSeatNumbers = Array.from(new Set(Array.isArray(seatNumbersArg) ? seatNumbersArg : [])).sort();
    if (!requireOnline('أنت حالياً أوفلاين. لازم إنترنت لتثبيت المقاعد الحالية.', 'warning')) {
      return { ok: false, code: 'offline', message: 'أنت حالياً أوفلاين. لازم إنترنت لتثبيت المقاعد الحالية.' };
    }

    if (isQaMode) {
      const holdExpiresAt = new Date(Date.now() + HOLD_RESUME_WINDOW_MS).toISOString();
      setSelectedSeats(normalizedSeatNumbers);
      setSelectedTrip((prev) => ({ ...(prev || tripArg), holdExpiresAt }));
      scheduleViewportScrollReset('auto');
      navigateTo('checkout');
      window.setTimeout(() => scheduleViewportScrollReset('auto'), 80);
      return { ok: true, holdExpiresAt, hold_expires_at: holdExpiresAt };
    }

    if (!tripArg?.instanceId) {
      const result = { ok: false, code: 'backend_trip_required', message: 'اختيار المقاعد غير متاح على الرحلة دي حالياً. جرّب تحديث النتائج واختيار رحلة تانية.' };
      showToast(result.message, 'error');
      return result;
    }

    const holdResult = await holdTripSeats({ tripInstanceId: tripArg.instanceId, seatNumbers: normalizedSeatNumbers });
    if (!holdResult?.ok) {
      setSelectedSeats([]);
      showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة.', 'error');
      try {
        setSelectedTrip(await hydrateTripWithSeats(tripArg));
      } catch (error) {
        log.warn('seat_rehydrate_after_hold_failure_failed', { tripInstanceId: tripArg.instanceId, error });
      }
      return holdResult;
    }

    setSelectedSeats(normalizedSeatNumbers);
    setSelectedTrip((prev) => ({ ...(prev || tripArg), holdExpiresAt: holdResult.hold_expires_at || holdResult.holdExpiresAt || null }));
    scheduleViewportScrollReset('auto');
    navigateTo('checkout');
    window.setTimeout(() => scheduleViewportScrollReset('auto'), 80);
    return holdResult;
  }, [isQaMode, navigateTo, requireOnline, selectedSeats, selectedTrip, showToast]);

  const processDelayedRefund = useCallback(async (tripToCancel) => {
    const bookingId = tripToCancel?.bookingId || tripToCancel?.id || null;
    if (!bookingId) return showToast('الإلغاء متاح فقط للحجوزات المؤكدة حالياً.', 'error');
    if (!requireOnline('أنت حالياً أوفلاين. اتأكد من الإنترنت قبل طلب الإلغاء.', 'warning')) return;

    setPendingCancellationBookingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
    try {
      const result = await cancelBookingAtomicCompat({
        bookingId,
        clientActionId: `cancel-ui-${bookingId}-${Date.now()}`,
      });
      if (!result?.ok) {
        showToast(formatCancellationErrorMessage(result), 'error');
        await refreshCloudState({ silent: true, force: true });
        return;
      }
      showToast(`تم الإلغاء، ورجعلك ${formatCurrency(result?.refundAmount || 0)} للمحفظة.`, 'success');
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
  }, [refreshCloudState, requireOnline, showToast]);

  const selectTripForSeats = useCallback(async (trip) => {
    if (!requireOnline('أنت حالياً أوفلاين. لازم إنترنت لتحميل المقاعد الحالية من السيرفر.', 'warning')) {
      return;
    }

    try {
      const hydrated = await hydrateTripWithSeats(trip);
      setSelectedTrip(hydrated);
      setSelectedSeats([]);
      navigateTo('seats');
    } catch (error) {
      log.error('seat_load_failed_before_selection', { tripInstanceId: trip?.instanceId || null, tripCode: trip?.tripCode || trip?.id || null, error });
      showToast('تعذر تحميل المقاعد الحالية. حاول مرة تانية.', 'error');
    }
  }, [navigateTo, requireOnline, showToast]);


  useEffect(() => {
    if (restoreAttemptedRef.current || !userId) return;
    restoreAttemptedRef.current = true;

    const draft = readBookingFlowDraft();
    if (!draft || draft.userId !== userId) return;

    const signature = JSON.stringify({
      activeView: draft.activeView,
      activePage: draft.activePage,
      savedAt: draft.savedAt,
      bookingId: draft.selectedTrip?.bookingId || draft.viewedTicket?.bookingId || null,
      pnr: draft.viewedTicket?.pnr || draft.currentInvoice?.pnr || null,
    });
    if (restoredDraftSignatureRef.current === signature) return;
    restoredDraftSignatureRef.current = signature;

    let cancelled = false;

    const restore = async () => {
      try {
        if (draft.searchParams) setSearchParams(draft.searchParams);
        if (draft.searchResults && Array.isArray(draft.searchResults.trips)) {
          setSearchResults(draft.searchResults);
        }

        if (draft.activeView === 'invoice' && draft.currentInvoice && draft.viewedTicket) {
          setCurrentInvoice(draft.currentInvoice);
          setViewedTicket(ensureTicketIdentity(draft.viewedTicket));
          navigateTo('invoice');
          return;
        }

        if (draft.activeView === 'ticket' && draft.viewedTicket) {
          setViewedTicket(ensureTicketIdentity(draft.viewedTicket));
          navigateTo('ticket', 'tickets');
          return;
        }

        if (draft.activeView === 'tracking' && draft.viewedTicket) {
          setViewedTicket(ensureTicketIdentity(draft.viewedTicket));
          navigateTo('tracking', 'tickets');
          return;
        }

        if (draft.activeView === 'search') {
          navigateTo('search');
          return;
        }

        const savedTrip = draft.selectedTrip;
        if (!savedTrip) return;

        const desiredView = draft.activeView === 'checkout' ? 'checkout' : 'seats';
        const savedHold = getHoldExpiry(savedTrip);
        const holdExpired = savedHold ? isHoldExpired(savedTrip) : true;

        if (holdExpired) {
          clearBookingFlowDraft();
          setSelectedSeats([]);
          navigateTo('search');
          if (savedHold) {
            showToast('انتهى وقت تثبيت المقاعد. اختار المقاعد من جديد.', 'warning');
          }
          return;
        }

        if (isQaMode || !savedTrip?.instanceId) {
          setSelectedTrip(savedTrip);
          setSelectedSeats(Array.isArray(draft.selectedSeats) ? draft.selectedSeats : []);
          navigateTo(desiredView);
          return;
        }

        const hydrated = await hydrateTripWithSeats(savedTrip);
        if (cancelled) return;

        const hydratedWithHold = {
          ...(hydrated || savedTrip),
          holdExpiresAt: savedHold || hydrated?.holdExpiresAt || hydrated?.hold_expires_at || null,
        };

        if (isHoldExpired(hydratedWithHold)) {
          clearBookingFlowDraft();
          setSelectedTrip(hydrated || savedTrip);
          setSelectedSeats([]);
          navigateTo('search');
          showToast('انتهى وقت تثبيت المقاعد. اختار المقاعد من جديد.', 'warning');
          return;
        }

        setSelectedTrip(hydratedWithHold);
        setSelectedSeats(Array.isArray(draft.selectedSeats) ? draft.selectedSeats : []);
        navigateTo(desiredView);
      } catch (error) {
        if (cancelled) return;
        clearBookingFlowDraft();
        log.warn('restore_booking_flow_draft_failed', { userId, error });
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [isQaMode, navigateTo, showToast, userId]);

  useEffect(() => {
    if (isQaMode || activeView !== 'seats' || !selectedTrip?.instanceId) return undefined;

    let cancelled = false;
    const syncSeatsFromServer = async () => {
      try {
        const hydrated = await hydrateTripWithSeats(selectedTrip);
        if (cancelled || !hydrated) return;
        setSelectedTrip((prev) => ({
          ...(hydrated || prev || {}),
          holdExpiresAt: getHoldExpiry(prev) || getHoldExpiry(hydrated) || null,
        }));
      } catch (error) {
        if (!cancelled) {
          log.warn('seat_live_refresh_failed', { tripInstanceId: selectedTrip?.instanceId || null, error });
        }
      }
    };

    const intervalId = window.setInterval(syncSeatsFromServer, 12000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncSeatsFromServer();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeView, isQaMode, selectedTrip?.instanceId]);

  const openTicket = useCallback((ticket) => {
    setViewedTicket(ensureTicketIdentity(ticket));
    navigateTo('ticket', 'tickets');
  }, [navigateTo]);

  const openTracking = useCallback((ticket) => {
    setViewedTicket(ensureTicketIdentity(ticket));
    navigateTo('tracking', 'tickets');
  }, [navigateTo]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const wait = (ms = 80) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const api = {
      snapshot: () => ({ ...qaStateRef.current }),
      async goHome() { navigateTo('main', 'home'); await wait(); return 'home'; },
      async goWallet() { navigateTo('main', 'wallet'); await wait(); return 'wallet'; },
      async goBookings() { navigateTo('main', 'bookings'); await wait(); return 'bookings'; },
      async goTickets() { navigateTo('main', 'tickets'); await wait(); return 'tickets'; },
      async search(params = null) {
        await handleSearch(params || qaStateRef.current.searchParams);
        await wait(140);
        return this.snapshot().searchResults;
      },
      async openTrip(index = 0) {
        const trip = qaStateRef.current.searchResults?.trips?.[index] || null;
        if (!trip) throw new Error('qa_trip_not_found');
        if (isQaMode) {
          setSelectedTrip(trip);
          setSelectedSeats([]);
          navigateTo('seats');
          await wait(120);
          return trip;
        }
        await selectTripForSeats(trip);
        await wait(160);
        return trip;
      },
      async selectFirstAvailableSeats(count = Number(qaStateRef.current.searchParams?.passengers || 1)) {
        const trip = qaStateRef.current.selectedTrip;
        if (!trip) throw new Error('qa_selected_trip_missing');
        const seats = Array.isArray(trip.seats) ? trip.seats.filter((seat) => seat?.status === 'available').slice(0, count).map((seat) => seat.number) : [];
        if (seats.length < count) throw new Error('qa_not_enough_available_seats');
        setSelectedSeats(seats);
        await wait();
        return seats;
      },
      async goCheckout() { await commitSeatSelection(); await wait(160); return this.snapshot(); },
      async completeBooking() {
        const trip = qaStateRef.current.selectedTrip;
        const seats = qaStateRef.current.selectedSeats;
        if (!trip || !Array.isArray(seats) || !seats.length) throw new Error('qa_checkout_not_ready');
        const result = await createBookingForTrip({ trip, seatNumbers: seats, passengers: Number(qaStateRef.current.searchParams?.passengers || 1), promoCode: '', hasLuggage: false, needsAccess: false });
        if (!result?.ok) throw new Error(result?.message || 'qa_booking_failed');
        finalizeBookingSuccess(result.booking, result.invoice);
        await wait(180);
        return this.snapshot();
      },
      async smoke() {
        await this.goHome();
        await this.search();
        await this.openTrip(0);
        await this.selectFirstAvailableSeats();
        await this.goCheckout();
        await this.completeBooking();
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

  const normalizedTrips = useMemo(
    () =>
      (Array.isArray(myTrips) ? myTrips : []).map((trip) => {
        const safeTrip = ensureTicketIdentity(trip);
        const bookingUi = getTripBookingUiState(safeTrip);
        return {
          ...safeTrip,
          bookingUi,
          status: bookingUi.displayStatus,
        };
      }),
    [myTrips],
  );

  const latestTrip = useMemo(() => {
    return normalizedTrips.find((trip) => ['upcoming', 'refund_pending'].includes(trip?.status)) || normalizedTrips[0] || null;
  }, [normalizedTrips]);

  const upcomingTickets = useMemo(
    () => normalizedTrips.filter((trip) => ['upcoming', 'refund_pending'].includes(trip?.status)),
    [normalizedTrips],
  );

  return {
    searchParams,
    setSearchParams,
    searchResults,
    isSearching,
    selectedTrip,
    setSelectedTrip,
    selectedSeats,
    setSelectedSeats,
    currentInvoice,
    setCurrentInvoice,
    viewedTicket,
    setViewedTicket,
    pendingCancellationBookingIds,
    setPendingCancellationBookingIds,
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
  };
}
