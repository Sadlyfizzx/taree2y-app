import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '../../lib/logger';
import {
  buildBlockedAccountMessage,
  loadCurrentProfile,
  setAccountAccessNotice,
} from '../../lib/auth';
import { isInactiveProfile, normalizeProfileRow } from '../../lib/account';
import { supabase } from '../../lib/supabase';

const log = createLogger('auth-session');

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authWarning, setAuthWarning] = useState('');

  const mountedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const sessionRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applyProfileState = useCallback((nextProfile, warning = '') => {
    if (!mountedRef.current) return;
    setProfile(nextProfile);
    setAuthWarning(warning);
  }, []);

  const clearSessionState = useCallback(() => {
    if (!mountedRef.current) return;
    setSession(null);
    setProfile(null);
    setAuthWarning('');
  }, []);

  const loadProfileForUser = useCallback(
    async (user, { silent = true } = {}) => {
      const requestId = ++loadRequestIdRef.current;

      if (!user?.id) {
        applyProfileState(null, '');
        return null;
      }

      if (!silent && mountedRef.current) {
        setAuthLoading(true);
      }

      try {
        const result = await loadCurrentProfile(user);

        if (!mountedRef.current || requestId !== loadRequestIdRef.current) {
          return result?.data || null;
        }

        const nextProfile = result?.data || null;

        if (nextProfile && isInactiveProfile(nextProfile)) {
          const blockedMessage = buildBlockedAccountMessage(nextProfile);
          setAccountAccessNotice(blockedMessage);

          log.warn('blocked_account_detected', {
            userId: user.id,
            accountStatus: nextProfile.account_status,
            deletedAt: nextProfile.deleted_at,
          });

          await supabase.auth.signOut({ scope: 'local' });
          clearSessionState();
          return null;
        }

        if (result?.error) {
          log.warn('profile_loaded_with_warning', {
            userId: user.id,
            source: result?.source || 'unknown',
            error: result.error,
          });
        } else {
          log.debug('profile_loaded', {
            userId: user.id,
            source: result?.source || 'db',
          });
        }

        applyProfileState(
          nextProfile,
          result?.error
            ? 'فيه مشكلة مزامنة بسيطة في بيانات الحساب. راجع إعدادات profiles على Supabase لو الرسالة بتتكرر.'
            : '',
        );

        return nextProfile;
      } catch (error) {
        if (!mountedRef.current || requestId !== loadRequestIdRef.current) {
          return null;
        }

        log.error('profile_load_failed', {
          userId: user.id,
          error,
        });

        applyProfileState(
          normalizeProfileRow(null, user),
          'تعذر تحميل البروفايل من السيرفر. التطبيق شغال ببيانات أساسية مؤقتًا.',
        );

        return null;
      } finally {
        if (
          !silent &&
          mountedRef.current &&
          requestId === loadRequestIdRef.current
        ) {
          setAuthLoading(false);
        }
      }
    },
    [applyProfileState, clearSessionState],
  );

  const refreshProfile = useCallback(
    async ({ silent = true } = {}) =>
      loadProfileForUser(sessionRef.current?.user || null, { silent }),
    [loadProfileForUser],
  );

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribed = false;

    const bootstrap = async () => {
      setAuthLoading(true);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (unsubscribed || !mountedRef.current) return;

        const currentSession = data.session ?? null;
        setSession(currentSession);

        if (currentSession?.user?.id) {
          await loadProfileForUser(currentSession.user, { silent: false });
        } else {
          setProfile(null);
          setAuthWarning('');
          setAuthLoading(false);
        }
      } catch (error) {
        log.error('bootstrap_failed', { error });

        if (!unsubscribed && mountedRef.current) {
          clearSessionState();
          setAuthLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (unsubscribed || !mountedRef.current) return;

      log.debug('auth_state_changed', {
        event,
        hasSession: Boolean(nextSession?.user?.id),
      });

      setSession(nextSession ?? null);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setAuthWarning('');
        setAuthLoading(false);
        return;
      }

      window.setTimeout(() => {
        if (!mountedRef.current || unsubscribed) return;

        loadProfileForUser(nextSession.user, { silent: true }).finally(() => {
          if (!unsubscribed && mountedRef.current) {
            setAuthLoading(false);
          }
        });
      }, 0);
    });

    return () => {
      unsubscribed = true;
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [clearSessionState, loadProfileForUser]);

  return {
    session,
    profile,
    authLoading,
    authWarning,
    refreshProfile,
  };
}
