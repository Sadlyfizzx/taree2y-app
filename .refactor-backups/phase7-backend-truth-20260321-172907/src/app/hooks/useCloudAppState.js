import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadSupabaseAppState, saveSupabaseAppState } from '../../lib/supabaseAppState';
import { readJSON, readNumber, demoKey } from '../../utils/storage';
import { getTripLifecycleStatus } from '../utils/travel';

export function useCloudAppState(userId) {
  const [wallet, setWallet] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [points, setPoints] = useState(0);
  const [subscription, setSubscription] = useState('none');
  const [backendReady, setBackendReady] = useState(false);
  const [backendLoading, setBackendLoading] = useState(true);
  const [didSeedSupabaseFromLocal, setDidSeedSupabaseFromLocal] = useState(false);

  const isHydratingCloudRef = useRef(false);
  const isSavingRef = useRef(false);
  const lastLocalMutationAtRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const currentStateSignatureRef = useRef('');

  const buildStateSignature = useCallback((state) => {
    return JSON.stringify({
      wallet: Number(state?.wallet ?? 0),
      transactions: Array.isArray(state?.transactions) ? state.transactions : [],
      myTrips: Array.isArray(state?.myTrips) ? state.myTrips : [],
      points: Number(state?.points ?? 0),
      subscription: state?.subscription || 'none',
    });
  }, []);

  const applyAppState = useCallback((nextState) => {
    const normalized = {
      wallet: Number(nextState?.wallet ?? 0),
      transactions: Array.isArray(nextState?.transactions) ? nextState.transactions : [],
      myTrips: Array.isArray(nextState?.myTrips) ? nextState.myTrips : [],
      points: Number(nextState?.points ?? 0),
      subscription: nextState?.subscription || 'none',
    };

    const signature = buildStateSignature(normalized);
    if (signature === currentStateSignatureRef.current) {
      return false;
    }

    isHydratingCloudRef.current = true;
    currentStateSignatureRef.current = signature;
    setWallet(normalized.wallet);
    setTransactions(normalized.transactions);
    setMyTrips(normalized.myTrips);
    setPoints(normalized.points);
    setSubscription(normalized.subscription);
    return true;
  }, [buildStateSignature]);

  const refreshCloudState = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!userId) return;

    const nowMs = Date.now();
    if (!force && silent) {
      if (isSavingRef.current) return;
      if (nowMs - lastLocalMutationAtRef.current < 1500) return;
      if (nowMs - lastRefreshAtRef.current < 2000) return;
    }

    if (!silent) {
      setBackendLoading(true);
    }

    const { data, error } = await loadSupabaseAppState(userId);
    if (error) {
      console.error('refreshCloudState error', error);
      if (!silent) {
        setBackendLoading(false);
      }
      return;
    }

    lastRefreshAtRef.current = Date.now();
    applyAppState({
      wallet: data?.wallet ?? 0,
      transactions: data?.transactions ?? [],
      myTrips: data?.myTrips ?? [],
      points: data?.points ?? 0,
      subscription: data?.subscription ?? 'none',
    });
    setBackendReady(true);
    setDidSeedSupabaseFromLocal(false);

    if (!silent) {
      setBackendLoading(false);
    }
  }, [applyAppState, userId]);

  useEffect(() => {
    let active = true;

    (async () => {
      setBackendLoading(true);

      const { data, error } = await loadSupabaseAppState(userId);
      if (!active) return;

      if (error) {
        console.error('initial loadSupabaseAppState error', error);
      }

      const localWallet = readNumber(demoKey(userId, 'wallet'), 0);
      const localTransactions = readJSON(demoKey(userId, 'txns'), []);
      const localTrips = readJSON(demoKey(userId, 'trips'), []);
      const localPoints = readNumber(demoKey(userId, 'points'), 0);
      const localSubscription = localStorage.getItem(demoKey(userId, 'sub')) || 'none';

      const cloudLooksEmpty = !data || (
        Number(data?.wallet ?? 0) === 0 &&
        Number(data?.points ?? 0) === 0 &&
        (data?.subscription ?? 'none') === 'none' &&
        (data?.transactions ?? []).length === 0 &&
        (data?.myTrips ?? []).length === 0
      );

      const localHasData =
        localWallet > 0 ||
        localPoints > 0 ||
        localSubscription !== 'none' ||
        localTransactions.length > 0 ||
        localTrips.length > 0;

      if (cloudLooksEmpty && localHasData) {
        applyAppState({
          wallet: localWallet,
          transactions: localTransactions,
          myTrips: localTrips,
          points: localPoints,
          subscription: localSubscription,
        });
        setDidSeedSupabaseFromLocal(true);
      } else {
        applyAppState({
          wallet: data?.wallet ?? 0,
          transactions: data?.transactions ?? [],
          myTrips: data?.myTrips ?? [],
          points: data?.points ?? 0,
          subscription: data?.subscription ?? 'none',
        });
        setDidSeedSupabaseFromLocal(false);
      }

      setBackendReady(true);
      setBackendLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [applyAppState, userId]);

  useEffect(() => {
    if (!backendReady) return;

    if (isHydratingCloudRef.current) {
      isHydratingCloudRef.current = false;
      return;
    }

    currentStateSignatureRef.current = buildStateSignature({
      wallet,
      transactions,
      myTrips,
      points,
      subscription,
    });
    lastLocalMutationAtRef.current = Date.now();
  }, [wallet, transactions, myTrips, points, subscription, backendReady, buildStateSignature]);

  useEffect(() => {
    if (!backendReady || !userId) return;

    const snapshot = {
      wallet,
      transactions,
      myTrips,
      points,
      subscription,
    };

    const timeoutId = setTimeout(async () => {
      try {
        isSavingRef.current = true;
        await saveSupabaseAppState(userId, snapshot);
        if (didSeedSupabaseFromLocal) {
          setDidSeedSupabaseFromLocal(false);
        }
        await refreshCloudState({ silent: true, force: true });
      } catch (error) {
        console.error('saveSupabaseAppState error', error);
      } finally {
        isSavingRef.current = false;
      }
    }, didSeedSupabaseFromLocal ? 120 : 350);

    return () => clearTimeout(timeoutId);
  }, [userId, wallet, transactions, myTrips, points, subscription, backendReady, didSeedSupabaseFromLocal, refreshCloudState]);

  useEffect(() => {
    if (!backendReady) return;

    localStorage.setItem(demoKey(userId, 'wallet'), String(wallet));
    localStorage.setItem(demoKey(userId, 'txns'), JSON.stringify(transactions));
    localStorage.setItem(demoKey(userId, 'trips'), JSON.stringify(myTrips));
    localStorage.setItem(demoKey(userId, 'points'), String(points));
    localStorage.setItem(demoKey(userId, 'sub'), subscription);
  }, [userId, wallet, transactions, myTrips, points, subscription, backendReady]);

  useEffect(() => {
    if (!backendReady) return;

    const syncNow = () => {
      refreshCloudState({ silent: true }).catch((error) => {
        console.error('refreshCloudState error', error);
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncNow();
      }
    };

    const intervalId = setInterval(syncNow, 8000);

    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [backendReady, refreshCloudState]);

  useEffect(() => {
    let changed = false;
    let awardedPoints = 0;

    const nextTrips = myTrips.map((trip) => {
      if (trip.status !== 'upcoming') return trip;

      const lifecycle = getTripLifecycleStatus(trip);
      if (lifecycle.key !== 'arrived') return trip;

      changed = true;
      if (!trip.pointsAwarded && trip.earnedPointsPending > 0) {
        awardedPoints += trip.earnedPointsPending;
      }

      return {
        ...trip,
        status: 'past',
        pointsAwarded: true,
      };
    });

    if (!changed) return;

    setMyTrips(nextTrips);
    if (awardedPoints > 0) {
      setPoints((p) => p + awardedPoints);
    }
  }, [myTrips]);

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
  };
}
