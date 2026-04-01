import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPromoPopupOffer } from '../../lib/promoEngine';
import {
  applyReferralCode as applyReferralCodeRpc,
  captureReferralCodeFromUrl,
  clearPendingReferralCode,
  getReferralSummary,
  readPendingReferralCode,
  recordCampaignEvent,
  stashPendingReferralCode,
} from '../../lib/engagement';
import { markOfferPopupSeen } from '../../lib/account';
import { useTripNotifications } from './useTripNotifications';

const PROMO_POPUP_COOLDOWN_KEY = 'taree2y_promo_popup_last_seen';

function readPromoPopupLastSeen(userId, popupKey) {
  if (typeof window === 'undefined' || !userId || !popupKey) return 0;
  try {
    const raw = window.localStorage.getItem(`${PROMO_POPUP_COOLDOWN_KEY}:${userId}:${popupKey}`);
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writePromoPopupLastSeen(userId, popupKey, timestamp = Date.now()) {
  if (typeof window === 'undefined' || !userId || !popupKey) return;
  try {
    window.localStorage.setItem(`${PROMO_POPUP_COOLDOWN_KEY}:${userId}:${popupKey}`, String(timestamp));
  } catch {
    // ignore storage errors
  }
}

export function useGrowthFlows({
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
  myTrips,
  showToast,
  navigateTo,
}) {
  const [promoPopupOffer, setPromoPopupOffer] = useState(null);
  const [promoHighlights, setPromoHighlights] = useState([]);
  const [referralSummary, setReferralSummary] = useState(null);
  const promoHighlightImpressionsRef = useRef(new Set());
  const promoPopupImpressionsRef = useRef(new Set());
  const dismissedPromoPopupRef = useRef(new Set());
  const pendingReferralApplyRef = useRef(new Set());
  const successfulReferralApplyRef = useRef(new Set());
  const attemptedAutoReferralApplyRef = useRef(new Set());
  const referralCodeFromUrl = useMemo(() => captureReferralCodeFromUrl(), []);

  const { notifications, unreadCount, markAllRead, clearNotifications, markNotificationRead, dismissNotification, requestBrowserPermission } = useTripNotifications({
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

  const applyReferralCodeSafely = useCallback(async (code, { silent = false, clearPendingOnFailure = false } = {}) => {
    if (!userId) {
      const result = { ok: false, code: 'auth_required', message: 'سجّل الدخول أولاً لاستخدام كود الدعوة.', data: {} };
      if (!silent) showToast(result.message, 'error');
      return result;
    }

    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      const result = { ok: false, code: 'referral_empty', message: 'اكتب كود الدعوة أولاً.', data: {} };
      if (!silent) showToast(result.message, 'error');
      return result;
    }

    const ownCode = String(referralSummary?.code || '').trim().toUpperCase();
    const appliedCode = String(referralSummary?.appliedCode || '').trim().toUpperCase();
    const requestKey = `${userId}:${normalizedCode}`;

    if (appliedCode) {
      const result = { ok: false, code: 'referral_already_applied', message: `الحساب مرتبط بالفعل بالكود ${appliedCode}.`, data: {} };
      clearPendingReferralCode();
      if (!silent) showToast(result.message, 'info');
      return result;
    }

    if (ownCode && ownCode === normalizedCode) {
      const result = { ok: false, code: 'referral_self_blocked', message: 'ما ينفعش تربط حسابك بنفس كود الدعوة الخاص بيك.', data: {} };
      clearPendingReferralCode();
      if (!silent) showToast(result.message, 'error');
      return result;
    }

    if (successfulReferralApplyRef.current.has(requestKey) || pendingReferralApplyRef.current.has(requestKey)) {
      return { ok: false, code: 'referral_inflight', message: '', data: {} };
    }

    pendingReferralApplyRef.current.add(requestKey);
    try {
      const result = await applyReferralCodeRpc({ userId, code: normalizedCode });
      if (result?.ok) {
        successfulReferralApplyRef.current.add(requestKey);
        clearPendingReferralCode();
      } else if (clearPendingOnFailure) {
        clearPendingReferralCode();
      }
      if (result?.message && !silent) {
        showToast(result.message, result.ok ? 'success' : 'error');
      }
      await refreshReferralSummary();
      return result;
    } finally {
      pendingReferralApplyRef.current.delete(requestKey);
    }
  }, [referralSummary?.appliedCode, referralSummary?.code, refreshReferralSummary, showToast, userId]);

  const handleApplyReferralCode = useCallback(async (code) => applyReferralCodeSafely(code), [applyReferralCodeSafely]);

  const handlePromoHighlightInteraction = useCallback((offer, action = 'opened') => {
    if (!userId || !offer?.campaignId) return;
    recordCampaignEvent({
      userId,
      campaignId: offer.campaignId,
      eventName: action === 'copied' ? 'offer_highlight_copied' : 'offer_highlight_opened',
      source: 'home_highlight',
      metadata: { code: offer.code || '', triggerKind: offer.triggerKind || '' },
    });
  }, [userId]);

  useEffect(() => {
    if (!referralCodeFromUrl) return;
    stashPendingReferralCode(referralCodeFromUrl);
  }, [referralCodeFromUrl]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setReferralSummary(null);
      return () => { active = false; };
    }
    (async () => {
      const summary = await getReferralSummary({ userId });
      if (active) setReferralSummary(summary);
    })();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId || !referralSummary) return () => { active = false; };
    if (referralSummary?.appliedCode) {
      clearPendingReferralCode();
      return () => { active = false; };
    }
    const pendingCode = String(readPendingReferralCode() || referralCodeFromUrl || '').trim().toUpperCase();
    if (!pendingCode || referralSummary?.canApplyCode === false) return () => { active = false; };
    const autoApplyKey = `${userId}:${pendingCode}`;
    if (attemptedAutoReferralApplyRef.current.has(autoApplyKey)) return () => { active = false; };
    attemptedAutoReferralApplyRef.current.add(autoApplyKey);
    (async () => {
      const result = await applyReferralCodeSafely(pendingCode, { silent: true });
      if (!active || !result?.message || result.code === 'referral_inflight') return;
      showToast(result.message, result.ok ? 'success' : 'error');
    })();
    return () => { active = false; };
  }, [applyReferralCodeSafely, referralCodeFromUrl, referralSummary, showToast, userId]);

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
      const cooldownHours = Math.max(1, Number(offer.cooldownHours || 24) || 24);
      const popupCooldownMs = cooldownHours * 60 * 60 * 1000;
      const backendLastSeenMs = profile?.last_offer_popup_at ? new Date(profile.last_offer_popup_at).getTime() : 0;
      const localLastSeenMs = readPromoPopupLastSeen(userId, popupKey);
      const lastSeenMs = Math.max(backendLastSeenMs || 0, localLastSeenMs || 0);
      if (lastSeenMs && Date.now() - lastSeenMs < popupCooldownMs) return;
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
  }, [userId, activeModal, isGuideOpen, promoContext, profile?.last_offer_popup_at, setActiveModal]);

  const dismissPromoOffer = useCallback(async () => {
    const popupKey = promoPopupOffer?.campaignId || promoPopupOffer?.code || promoPopupOffer?.title || 'popup';
    if (userId) {
      dismissedPromoPopupRef.current.add(`${userId}:${popupKey}`);
      writePromoPopupLastSeen(userId, popupKey);
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
    if (userId) {
      await markOfferPopupSeen(userId);
      await refreshProfile?.();
    }
    setPromoPopupOffer(null);
    setActiveModal(null);
  }, [promoPopupOffer, refreshProfile, setActiveModal, userId]);

  const handleNotificationAction = useCallback(async (item) => {
    if (!item) return;
    if (!item.readAt && item.id) {
      await markNotificationRead(item.id);
    }

    const action = String(item.ctaAction || '').trim().toLowerCase();
    const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
    const promoCode = String(payload.code || payload.promoCode || payload.promo_code || item.code || '').trim().toUpperCase();

    if (action === 'open_ticket' || action === 'open_tickets') {
      setActiveModal(null);
      navigateTo('main', 'tickets');
      return;
    }
    if (action === 'open_trip' || action === 'open_booking' || action === 'open_bookings') {
      setActiveModal(null);
      navigateTo('main', 'bookings');
      return;
    }
    if (action === 'open_wallet') {
      setActiveModal(null);
      navigateTo('main', 'wallet');
      return;
    }
    if (action === 'open_referral') {
      setActiveModal(null);
      navigateTo('main', 'profile');
      showToast('راجع قسم الدعوات والإحالة من الحساب.', 'success');
      return;
    }
    if (action === 'use_offer' || action === 'open_offer' || action === 'open_home') {
      setActiveModal(null);
      navigateTo('main', 'home');
      if (promoCode) showToast(`الكود المتاح: ${promoCode}`, 'success');
      return;
    }
    if (item.category === 'wallet') {
      setActiveModal(null);
      navigateTo('main', 'wallet');
      return;
    }
    if (item.category === 'promo') {
      setActiveModal(null);
      navigateTo('main', 'home');
      if (promoCode) showToast(`الكود المتاح: ${promoCode}`, 'success');
      return;
    }
    if (item.category === 'referral') {
      setActiveModal(null);
      navigateTo('main', 'profile');
      return;
    }
    if (item.category === 'trip') {
      setActiveModal(null);
      navigateTo('main', 'bookings');
    }
  }, [markNotificationRead, navigateTo, setActiveModal, showToast]);

  return {
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
  };
}
