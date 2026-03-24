import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../lib/logger';
import { ensureProfileForUser, normalizeProfileRow } from '../../lib/account';

const log = createLogger('auth-session');

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadProfile = useCallback(async (user) => {
    if (!user?.id) {
      setProfile(null);
      return null;
    }

    const { data, error } = await ensureProfileForUser(user);

    if (error) {
      log.warn('profile_bootstrap_failed', {
        userId: user.id,
        error,
      });
    }

    const normalized = normalizeProfileRow(data, user);
    setProfile(normalized);
    return normalized;
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      log.error('refresh_profile_failed', { error });
      return null;
    }

    const activeSession = data.session ?? null;
    if (!activeSession?.user) {
      setProfile(null);
      return null;
    }

    return loadProfile(activeSession.user);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentSession = data.session ?? null;
        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user?.id) {
          await loadProfile(currentSession.user);
        } else {
          setProfile(null);
        }
      } catch (error) {
        log.error('bootstrap_failed', { error });
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession ?? null);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      window.setTimeout(() => {
        if (!mounted) return;

        loadProfile(nextSession.user).finally(() => {
          if (mounted) setAuthLoading(false);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return { session, profile, authLoading, refreshProfile };
}
