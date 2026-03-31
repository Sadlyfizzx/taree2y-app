import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSupabaseAppState } from '../../lib/supabaseAppState';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../lib/logger';
import { sortWalletTransactions } from '../../lib/wallet';
import { isQaModeEnabled, readQaAppState } from '../utils/qaMode';

const log = createLogger('cloud-app-state');

const EMPTY_APP_STATE = {
  wallet: 0,
  transactions: [],
  myTrips: [],
  points: 0,
  subscription: 'none',
};

function normalizeAppState(nextState) {
  return {
    wallet: Number(nextState?.wallet ?? 0),
    transactions: Array.isArray(nextState?.transactions)
      ? sortWalletTransactions(nextState.transactions)
      : [],
    myTrips: Array.isArray(nextState?.myTrips) ? nextState.myTrips : [],
    points: Number(nextState?.points ?? 0),
    subscription: nextState?.subscription || 'none',
  };
}

export function useCloudAppState(userId) {
  const [wallet, setWallet] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [points, setPoints] = useState(0);
  const [subscription, setSubscription] = useState('none');
  const [backendReady, setBackendReady] = useState(false);
  const [backendLoading, setBackendLoading] = useState(true);

  const currentStateSignatureRef = useRef('');
  const refreshInFlightRef = useRef(null);
  const lastRefreshAtRef = useRef(0);

  const buildStateSignature = useCallback(
    (state) =>
      JSON.stringify({
        wallet: Number(state?.wallet ?? 0),
        transactions: Array.isArray(state?.transactions)
          ? sortWalletTransactions(state.transactions)
          : [],
        myTrips: Array.isArray(state?.myTrips) ? state.myTrips : [],
        points: Number(state?.points ?? 0),
        subscription: state?.subscription || 'none',
      }),
    [],
  );

  const applyAppState = useCallback(
    (nextState) => {
      const normalized = normalizeAppState(nextState);
      const signature = buildStateSignature(normalized);

      if (signature === currentStateSignatureRef.current) {
        return false;
      }

      currentStateSignatureRef.current = signature;
      setWallet(normalized.wallet);
      setTransactions(normalized.transactions);
      setMyTrips(normalized.myTrips);
      setPoints(normalized.points);
      setSubscription(normalized.subscription);
      return true;
    },
    [buildStateSignature],
  );

  const refreshCloudState = useCallback(
    async ({ silent = false, force = false } = {}) => {
      if (isQaModeEnabled()) {
        const qaState = readQaAppState() || EMPTY_APP_STATE;
        applyAppState(qaState);
        setBackendReady(true);
        setBackendLoading(false);
        return {
          ok: true,
          code: 'qa_mode',
          message: 'تم تحميل حالة الاختبار المحلية.',
          data: qaState,
        };
      }

      if (!userId) {
        applyAppState(EMPTY_APP_STATE);
        setBackendReady(false);
        setBackendLoading(false);
        return {
          ok: true,
          code: 'empty_user',
          message: 'لا يوجد مستخدم نشط حاليًا.',
          data: EMPTY_APP_STATE,
        };
      }

      const nowMs = Date.now();
      if (!force && refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      if (!force && silent && nowMs - lastRefreshAtRef.current < 2000) {
        return {
          ok: true,
          code: 'refresh_skipped',
          message: 'تم تجاهل تحديث متكرر خلال وقت قصير.',
          data: null,
        };
      }

      if (!silent) setBackendLoading(true);

      const task = (async () => {
        const { data, error } = await loadSupabaseAppState(userId);

        if (error) {
          log.error('refresh_failed', {
            userId,
            error,
          });

          return {
            ok: false,
            code: 'refresh_failed',
            message: 'تعذر تحديث البيانات من السيرفر.',
            error,
          };
        }

        const normalized = normalizeAppState({
          wallet: data?.wallet ?? 0,
          transactions: data?.transactions ?? [],
          myTrips: data?.myTrips ?? [],
          points: data?.points ?? 0,
          subscription: data?.subscription ?? 'none',
        });

        lastRefreshAtRef.current = Date.now();
        applyAppState(normalized);
        setBackendReady(true);

        log.debug('refresh_completed', {
          userId,
          wallet: normalized.wallet,
          trips: normalized.myTrips.length,
        });

        return {
          ok: true,
          code: 'ok',
          message: 'تم تحديث الحالة من السيرفر.',
          data: normalized,
        };
      })();

      refreshInFlightRef.current = task;

      try {
        return await task;
      } finally {
        refreshInFlightRef.current = null;
        if (!silent) setBackendLoading(false);
      }
    },
    [applyAppState, userId],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      if (isQaModeEnabled()) {
        const qaState = readQaAppState() || EMPTY_APP_STATE;
        applyAppState(qaState);
        setBackendReady(true);
        setBackendLoading(false);
        return;
      }

      if (!userId) {
        applyAppState(EMPTY_APP_STATE);
        setBackendReady(false);
        setBackendLoading(false);
        return;
      }

      setBackendLoading(true);

      const result = await refreshCloudState({ force: true });
      if (!active) return;

      if (!result?.ok) {
        applyAppState(EMPTY_APP_STATE);
        setBackendReady(true);
        setBackendLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [applyAppState, refreshCloudState, userId]);

  useEffect(() => {
    if (isQaModeEnabled() || !backendReady || !userId) return;

    const syncNow = () =>
      refreshCloudState({ silent: true }).catch((error) =>
        log.error('realtime_refresh_failed', { userId, error }),
      );

    const channel = supabase
      .channel(`taree2y-live-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_wallets',
          filter: `user_id=eq.${userId}`,
        },
        syncNow,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_wallet_transactions',
          filter: `user_id=eq.${userId}`,
        },
        syncNow,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`,
        },
        syncNow,
      )
      .subscribe();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncNow();
    };

    const intervalId = window.setInterval(syncNow, 15000);
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [backendReady, refreshCloudState, userId]);

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
    backendLoading,
    refreshCloudState,
  };
}

